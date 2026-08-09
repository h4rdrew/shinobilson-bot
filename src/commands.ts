import { SlashCommandBuilder } from "discord.js";
import { RANDOM_GENRES } from "./random.js";

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
    .setName("play-next")
    .setDescription("Adiciona uma música como próxima da fila")
    .addStringOption((option) =>
      option
        .setName("busca")
        .setDescription("Nome da música ou link do YouTube")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("random")
    .setDescription("Adiciona músicas aleatórias de um gênero à fila")
    .addStringOption((option) =>
      option
        .setName("genero")
        .setDescription("Gênero musical")
        .setRequired(true)
        .addChoices(...RANDOM_GENRES.map(({ name, value }) => ({ name, value }))),
    )
    .addIntegerOption((option) =>
      option
        .setName("quantidade")
        .setDescription("Quantidade de músicas (padrão: 1)")
        .setMinValue(1)
        .setMaxValue(10),
    ),
  new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Pula a música atual"),
  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Exibe a fila de músicas"),
  new SlashCommandBuilder()
    .setName("remove")
    .setDescription("Remove uma música específica da fila de espera")
    .addIntegerOption((option) =>
      option
        .setName("posicao")
        .setDescription("Posição mostrada na lista de próximas músicas")
        .setMinValue(1)
        .setRequired(true),
    ),
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
