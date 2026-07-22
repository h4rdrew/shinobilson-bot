import { spawn, type ChildProcess } from "node:child_process";
import { createRequire } from "node:module";
import {
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  type AudioPlayer,
  type VoiceConnection,
} from "@discordjs/voice";
import type { Guild, GuildMember, SendableChannels, VoiceBasedChannel } from "discord.js";
import { createYouTubeProcess, type Track } from "./youtube.js";
import { logger } from "./logger.js";

const require = createRequire(import.meta.url);
const ffmpegPath = require("ffmpeg-static") as string | null;

export class GuildMusicQueue {
  readonly tracks: Track[] = [];
  current?: Track;
  readonly player: AudioPlayer;
  private connection?: VoiceConnection;
  private processes: ChildProcess[] = [];
  private textChannel?: SendableChannels;
  private stopping = false;

  constructor(
    readonly guild: Guild,
    private readonly onEmpty: () => void,
  ) {
    this.player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
    });
    this.player.on("stateChange", (oldState, newState) => {
      logger.debug("audio.state.changed", {
        guildId: this.guild.id,
        from: oldState.status,
        to: newState.status,
        trackId: this.current?.id,
      });
    });
    this.player.on(AudioPlayerStatus.Idle, () => void this.onIdle());
    this.player.on("error", (error) => {
      logger.error("audio.player.failed", error, {
        guildId: this.guild.id,
        trackId: this.current?.id,
      });
      void this.notify("Não consegui reproduzir essa música. Pulando para a próxima…");
      // O AudioPlayer entra em Idle após um erro; o listener de Idle avança a fila.
    });
  }

  async connect(channel: VoiceBasedChannel, textChannel: SendableChannels): Promise<void> {
    this.textChannel = textChannel;
    if (this.connection?.joinConfig.channelId === channel.id) {
      logger.debug("voice.connection.reused", { guildId: this.guild.id, channelId: channel.id });
      return;
    }
    if (this.connection) this.connection.destroy();

    logger.info("voice.connection.started", { guildId: this.guild.id, channelId: channel.id });
    const startedAt = Date.now();
    this.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });
    this.connection.on("stateChange", (oldState, newState) => {
      logger.debug("voice.state.changed", {
        guildId: this.guild.id,
        channelId: channel.id,
        from: oldState.status,
        to: newState.status,
      });
    });
    this.connection.subscribe(this.player);
    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(this.connection!, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection!, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        logger.warn("voice.connection.disconnected", { guildId: this.guild.id, channelId: channel.id });
        this.destroy();
      }
    });
    await entersState(this.connection, VoiceConnectionStatus.Ready, 20_000);
    logger.info("voice.connection.ready", {
      guildId: this.guild.id,
      channelId: channel.id,
      elapsedMs: Date.now() - startedAt,
    });
  }

  async enqueue(track: Track): Promise<void> {
    this.tracks.push(track);
    logger.info("queue.track.added", {
      guildId: this.guild.id,
      trackId: track.id,
      title: track.title,
      waiting: this.tracks.length,
    });
    if (!this.current) await this.playNext();
  }

  skip(): boolean {
    if (!this.current) return false;
    logger.info("queue.track.skipped", { guildId: this.guild.id, trackId: this.current.id });
    return this.player.stop(true);
  }

  togglePause(): "paused" | "resumed" | "nothing" {
    if (!this.current) return "nothing";
    if (this.player.state.status === AudioPlayerStatus.Paused) {
      return this.player.unpause() ? "resumed" : "nothing";
    }
    return this.player.pause(true) ? "paused" : "nothing";
  }

  isMemberInMyChannel(member: GuildMember): boolean {
    return Boolean(
      member.voice.channelId && member.voice.channelId === this.connection?.joinConfig.channelId,
    );
  }

  destroy(): void {
    logger.info("queue.destroyed", {
      guildId: this.guild.id,
      currentTrackId: this.current?.id,
      discardedTracks: this.tracks.length,
    });
    this.stopping = true;
    this.tracks.length = 0;
    this.current = undefined;
    this.killProcesses();
    this.player.stop(true);
    if (this.connection?.state.status !== VoiceConnectionStatus.Destroyed) {
      this.connection?.destroy();
    }
    this.connection = undefined;
    this.onEmpty();
  }

  private async onIdle(): Promise<void> {
    this.finishCurrent();
    if (this.stopping) return;
    await this.playNext();
  }

  private finishCurrent(): void {
    this.killProcesses();
    this.current = undefined;
  }

  private killProcesses(): void {
    for (const process of this.processes) {
      if (!process.killed) process.kill();
    }
    this.processes = [];
  }

  private async playNext(): Promise<void> {
    if (this.current || this.stopping) return;
    const track = this.tracks.shift();
    if (!track) {
      this.destroy();
      return;
    }

    this.current = track;
    logger.info("queue.track.preparing", {
      guildId: this.guild.id,
      trackId: track.id,
      title: track.title,
      url: track.url,
    });
    try {
      const downloader = createYouTubeProcess(track.url);
      if (!downloader.stdout) throw new Error("O yt-dlp não forneceu um fluxo de áudio.");
      if (!ffmpegPath) throw new Error("FFmpeg não foi encontrado.");
      let ytdlpError = "";
      downloader.stderr?.on("data", (chunk: Buffer) => {
        ytdlpError = `${ytdlpError}${chunk.toString()}`.slice(-4_000);
      });
      void downloader.catch((error: unknown) => {
        if (!downloader.killed && !this.stopping) {
          logger.error("youtube.stream.failed", error, {
            guildId: this.guild.id,
            trackId: track.id,
            stderr: ytdlpError,
          });
        }
      });

      const ffmpeg = spawn(ffmpegPath, [
        "-hide_banner", "-loglevel", "error", "-i", "pipe:0",
        "-f", "s16le", "-ar", "48000", "-ac", "2", "pipe:1",
      ], { stdio: ["pipe", "pipe", "pipe"] });
      downloader.stdout.pipe(ffmpeg.stdin!);
      this.processes = [downloader as unknown as ChildProcess, ffmpeg];
      logger.info("ffmpeg.spawned", {
        guildId: this.guild.id,
        trackId: track.id,
        pid: ffmpeg.pid,
        executable: ffmpegPath,
      });

      let ffmpegError = "";
      ffmpeg.stderr?.on("data", (chunk: Buffer) => {
        ffmpegError = `${ffmpegError}${chunk.toString()}`.slice(-2_000);
      });
      ffmpeg.on("error", (error) => {
        logger.error("ffmpeg.spawn.failed", error, { guildId: this.guild.id, trackId: track.id });
        this.player.emit("error", error);
      });
      ffmpeg.on("close", (code) => {
        logger.info("ffmpeg.closed", {
          guildId: this.guild.id,
          trackId: track.id,
          exitCode: code,
          expected: this.stopping || this.current?.id !== track.id || code === 0,
          stderr: ffmpegError,
        });
      });

      const resource = createAudioResource(ffmpeg.stdout!, {
        inputType: StreamType.Raw,
        metadata: track,
      });
      this.player.play(resource);
      logger.info("queue.track.started", { guildId: this.guild.id, trackId: track.id });
      await this.notify(`▶️ Tocando agora: **${track.title}**`);
    } catch (error) {
      logger.error("queue.track.failed", error, { guildId: this.guild.id, trackId: track.id });
      await this.notify(`Não foi possível tocar **${track.title}**. Pulando…`);
      this.finishCurrent();
      await this.playNext();
    }
  }

  private async notify(message: string): Promise<void> {
    try {
      await this.textChannel?.send(message);
    } catch (error) {
      logger.error("discord.notification.failed", error, { guildId: this.guild.id });
    }
  }
}

export class QueueManager {
  private readonly queues = new Map<string, GuildMusicQueue>();

  get(guildId: string): GuildMusicQueue | undefined {
    return this.queues.get(guildId);
  }

  getOrCreate(guild: Guild): GuildMusicQueue {
    let queue = this.queues.get(guild.id);
    if (!queue) {
      queue = new GuildMusicQueue(guild, () => this.queues.delete(guild.id));
      this.queues.set(guild.id, queue);
    }
    return queue;
  }

  destroyAll(): void {
    for (const queue of [...this.queues.values()]) queue.destroy();
  }
}
