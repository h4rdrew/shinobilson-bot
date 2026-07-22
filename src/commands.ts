import { SlashCommandBuilder } from "discord.js";

export const commands = [
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Toca ou adiciona uma música do YouTube à fila")
    .addStringOption((option) =>
      option
        .setName("busca")
        .setDescription("Nome da música ou link do YouTube")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Pula a música atual"),
  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Exibe a fila de músicas"),
  new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pausa ou retoma a música atual"),
  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Limpa a fila e desconecta o bot"),
  new SlashCommandBuilder()
    .setName("search")
    .setDescription("Pesquisa músicas no YouTube para você escolher")
    .addStringOption((option) =>
      option
        .setName("busca")
        .setDescription("O que deseja ouvir")
        .setRequired(true),
    ),
].map((command) => command.toJSON());
