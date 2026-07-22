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
    this.player.on(AudioPlayerStatus.Idle, () => void this.onIdle());
    this.player.on("error", (error) => {
      console.error(`[player:${this.guild.id}]`, error);
      void this.notify("Não consegui reproduzir essa música. Pulando para a próxima…");
      // O AudioPlayer entra em Idle após um erro; o listener de Idle avança a fila.
    });
  }

  async connect(channel: VoiceBasedChannel, textChannel: SendableChannels): Promise<void> {
    this.textChannel = textChannel;
    if (this.connection?.joinConfig.channelId === channel.id) return;
    if (this.connection) this.connection.destroy();

    this.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });
    this.connection.subscribe(this.player);
    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(this.connection!, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection!, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        this.destroy();
      }
    });
    await entersState(this.connection, VoiceConnectionStatus.Ready, 20_000);
  }

  async enqueue(track: Track): Promise<void> {
    this.tracks.push(track);
    if (!this.current) await this.playNext();
  }

  skip(): boolean {
    if (!this.current) return false;
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
    try {
      const downloader = createYouTubeProcess(track.url);
      if (!downloader.stdout) throw new Error("O yt-dlp não forneceu um fluxo de áudio.");
      if (!ffmpegPath) throw new Error("FFmpeg não foi encontrado.");
      void downloader.catch((error: unknown) => {
        if (!downloader.killed && !this.stopping) {
          console.error(`[yt-dlp:${this.guild.id}]`, error);
        }
      });

      const ffmpeg = spawn(ffmpegPath, [
        "-hide_banner", "-loglevel", "error", "-i", "pipe:0",
        "-f", "s16le", "-ar", "48000", "-ac", "2", "pipe:1",
      ], { stdio: ["pipe", "pipe", "pipe"] });
      downloader.stdout.pipe(ffmpeg.stdin!);
      this.processes = [downloader as unknown as ChildProcess, ffmpeg];

      let ffmpegError = "";
      ffmpeg.stderr?.on("data", (chunk: Buffer) => {
        ffmpegError = `${ffmpegError}${chunk.toString()}`.slice(-2_000);
      });
      ffmpeg.on("error", (error) => this.player.emit("error", error));
      ffmpeg.on("close", (code) => {
        if (code && this.current?.id === track.id && !this.stopping) {
          console.error(`[ffmpeg:${this.guild.id}] código ${code}: ${ffmpegError}`);
        }
      });

      const resource = createAudioResource(ffmpeg.stdout!, {
        inputType: StreamType.Raw,
        metadata: track,
      });
      this.player.play(resource);
      await this.notify(`▶️ Tocando agora: **${track.title}**`);
    } catch (error) {
      console.error(`[youtube:${this.guild.id}]`, error);
      await this.notify(`Não foi possível tocar **${track.title}**. Pulando…`);
      this.finishCurrent();
      await this.playNext();
    }
  }

  private async notify(message: string): Promise<void> {
    try {
      await this.textChannel?.send(message);
    } catch (error) {
      console.error(`[mensagem:${this.guild.id}]`, error);
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
