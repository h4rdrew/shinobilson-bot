import {
  ActionRowBuilder,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  StringSelectMenuBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
  type VoiceBasedChannel,
} from "discord.js";
import { config } from "./config.js";
import { formatDuration, truncate } from "./format.js";
import { QueueManager } from "./music-queue.js";
import { searchYouTube, type Track } from "./youtube.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});
const queues = new QueueManager();

function memberVoiceChannel(interaction: ChatInputCommandInteraction): VoiceBasedChannel | null {
  const member = interaction.member as GuildMember;
  return member.voice.channel;
}

async function requireControl(
  interaction: ChatInputCommandInteraction,
) {
  const queue = interaction.guildId ? queues.get(interaction.guildId) : undefined;
  const member = interaction.member as GuildMember;
  if (!queue?.current) {
    await interaction.reply({ content: "Não há nenhuma música tocando.", ephemeral: true });
    return null;
  }
  if (!queue.isMemberInMyChannel(member)) {
    await interaction.reply({
      content: "Entre no mesmo canal de voz que eu para usar este comando.",
      ephemeral: true,
    });
    return null;
  }
  return queue;
}

async function addTrack(interaction: ChatInputCommandInteraction, track: Track): Promise<void> {
  const voiceChannel = memberVoiceChannel(interaction);
  if (!voiceChannel || !interaction.guild || !interaction.channel?.isSendable()) {
    await interaction.editReply("Entre em um canal de voz antes de escolher uma música.");
    return;
  }

  const queue = queues.getOrCreate(interaction.guild);
  if (queue.current && !queue.isMemberInMyChannel(interaction.member as GuildMember)) {
    await interaction.editReply("Já estou tocando música em outro canal de voz.");
    return;
  }

  const wasPlaying = Boolean(queue.current);
  try {
    await queue.connect(voiceChannel, interaction.channel);
    await queue.enqueue(track);
    await interaction.editReply(
      wasPlaying
        ? `✅ **${track.title}** foi adicionada à fila.`
        : `✅ Preparando **${track.title}**…`,
    );
  } catch (error) {
    console.error(error);
    if (!queue.current) queue.destroy();
    await interaction.editReply("Não consegui entrar no canal de voz. Confira minhas permissões.");
  }
}

async function handlePlay(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!memberVoiceChannel(interaction)) {
    await interaction.reply({ content: "Entre em um canal de voz primeiro.", ephemeral: true });
    return;
  }
  await interaction.deferReply();
  try {
    const [track] = await searchYouTube(
      interaction.options.getString("busca", true),
      interaction.user.username,
      1,
    );
    if (!track) {
      await interaction.editReply("Não encontrei nenhum resultado no YouTube.");
      return;
    }
    await addTrack(interaction, track);
  } catch (error) {
    console.error(error);
    await interaction.editReply("O YouTube não respondeu à pesquisa. Tente novamente em instantes.");
  }
}

async function handleSearch(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!memberVoiceChannel(interaction)) {
    await interaction.reply({ content: "Entre em um canal de voz primeiro.", ephemeral: true });
    return;
  }
  await interaction.deferReply();
  try {
    const results = await searchYouTube(
      interaction.options.getString("busca", true),
      interaction.user.username,
      5,
    );
    if (!results.length) {
      await interaction.editReply("Não encontrei nenhum resultado no YouTube.");
      return;
    }

    const customId = `search:${interaction.id}`;
    const menu = new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder("Escolha uma música")
      .addOptions(results.map((track, index) => ({
        label: truncate(track.title, 100),
        description: `Resultado ${index + 1} • ${formatDuration(track.durationSeconds)}`,
        value: String(index),
      })));
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
    const response = await interaction.editReply({
      content: "Selecione um resultado para adicionar à fila:",
      components: [row],
    });

    try {
      const selection = await response.awaitMessageComponent({
        filter: (item) => item.customId === customId && item.user.id === interaction.user.id,
        time: 60_000,
      });
      if (!selection.isStringSelectMenu()) throw new Error("Componente de seleção inválido.");
      await selection.deferUpdate();
      const track = results[Number(selection.values[0])];
      if (!track) throw new Error("Seleção inválida.");
      await interaction.editReply({ components: [] });
      await addTrack(interaction, track);
    } catch {
      await interaction.editReply({
        content: "A pesquisa expirou. Use `/search` novamente.",
        components: [],
      });
    }
  } catch (error) {
    console.error(error);
    await interaction.editReply("O YouTube não respondeu à pesquisa. Tente novamente em instantes.");
  }
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Conectado como ${readyClient.user.tag}.`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() || !interaction.inCachedGuild()) return;
  try {
    switch (interaction.commandName) {
      case "play":
        await handlePlay(interaction);
        break;
      case "search":
        await handleSearch(interaction);
        break;
      case "skip": {
        const queue = await requireControl(interaction);
        if (queue) await interaction.reply(queue.skip() ? "⏭️ Música pulada." : "Não consegui pular a música.");
        break;
      }
      case "pause": {
        const queue = await requireControl(interaction);
        if (!queue) break;
        const state = queue.togglePause();
        await interaction.reply(
          state === "paused" ? "⏸️ Música pausada." : state === "resumed" ? "▶️ Música retomada." : "Não consegui alterar a reprodução.",
        );
        break;
      }
      case "stop": {
        const queue = await requireControl(interaction);
        if (queue) {
          queue.destroy();
          await interaction.reply("⏹️ Fila limpa e bot desconectado.");
        }
        break;
      }
      case "queue": {
        const queue = interaction.guildId ? queues.get(interaction.guildId) : undefined;
        if (!queue?.current) {
          await interaction.reply({ content: "A fila está vazia.", ephemeral: true });
          break;
        }
        const upcoming = queue.tracks.slice(0, 10);
        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle("🎵 Fila de reprodução")
          .setDescription(`**Tocando agora**\n[${truncate(queue.current.title, 100)}](${queue.current.url}) • ${formatDuration(queue.current.durationSeconds)}\nPedido por ${queue.current.requestedBy}`)
          .addFields({
            name: "Próximas músicas",
            value: upcoming.length
              ? upcoming.map((track, index) => `${index + 1}. [${truncate(track.title, 80)}](${track.url}) • ${formatDuration(track.durationSeconds)}`).join("\n")
              : "Nenhuma música aguardando.",
          })
          .setFooter({ text: queue.tracks.length > 10 ? `E mais ${queue.tracks.length - 10} música(s)…` : `${queue.tracks.length} música(s) na espera` });
        await interaction.reply({ embeds: [embed] });
        break;
      }
    }
  } catch (error) {
    console.error(error);
    const message = { content: "Ocorreu um erro inesperado ao executar o comando.", ephemeral: true } as const;
    if (interaction.replied || interaction.deferred) await interaction.followUp(message);
    else await interaction.reply(message);
  }
});

async function shutdown(): Promise<void> {
  queues.destroyAll();
  client.destroy();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());

await client.login(config.token);
