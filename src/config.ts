import "dotenv/config";

function required(name: "DISCORD_TOKEN" | "CLIENT_ID"): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`A variável de ambiente ${name} não foi definida.`);
  }
  return value;
}

export const config = {
  token: required("DISCORD_TOKEN"),
  clientId: required("CLIENT_ID"),
  guildId: process.env.GUILD_ID?.trim() || undefined,
  cookiesFile: process.env.YOUTUBE_COOKIES_FILE?.trim() || undefined,
};
