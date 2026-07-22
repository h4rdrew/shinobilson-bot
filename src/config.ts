import "dotenv/config";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

function required(name: "DISCORD_TOKEN" | "CLIENT_ID"): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`A variável de ambiente ${name} não foi definida.`);
  }
  return value;
}

const configuredCookiesFile = process.env.YOUTUBE_COOKIES_FILE?.trim() || undefined;
const resolvedCookiesFile = configuredCookiesFile
  ? resolve(process.cwd(), configuredCookiesFile)
  : undefined;

export const config = {
  token: required("DISCORD_TOKEN"),
  clientId: required("CLIENT_ID"),
  guildId: process.env.GUILD_ID?.trim() || undefined,
  cookiesFile: resolvedCookiesFile && existsSync(resolvedCookiesFile)
    ? resolvedCookiesFile
    : undefined,
  missingCookiesFile: resolvedCookiesFile && !existsSync(resolvedCookiesFile)
    ? resolvedCookiesFile
    : undefined,
};
