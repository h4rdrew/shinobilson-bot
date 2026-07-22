import { constants, chmodSync, copyFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { youtubeDl as youtubedl } from "youtube-dl-exec";
import { config } from "./config.js";
import { logger } from "./logger.js";

export interface Track {
  id: string;
  title: string;
  url: string;
  durationSeconds: number;
  thumbnail?: string;
  requestedBy: string;
}

interface YtDlpEntry {
  id?: string;
  title?: string;
  webpage_url?: string;
  url?: string;
  duration?: number;
  thumbnail?: string;
}

interface YtDlpResult extends YtDlpEntry {
  entries?: YtDlpEntry[];
}

const youtubeHosts = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
]);

export function isYouTubeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && youtubeHosts.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

interface RuntimeCookies {
  file?: string;
  cleanup: () => void;
}

function prepareRuntimeCookies(): RuntimeCookies {
  if (!config.cookiesFile) return { cleanup: () => undefined };

  const file = join(
    tmpdir(),
    `shinobilson-youtube-cookies-${process.pid}-${randomUUID()}.txt`,
  );
  copyFileSync(config.cookiesFile, file, constants.COPYFILE_EXCL);
  chmodSync(file, 0o600);

  let removed = false;
  return {
    file,
    cleanup: () => {
      if (removed) return;
      removed = true;
      try {
        unlinkSync(file);
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== "ENOENT") {
          logger.warn("youtube.cookies.cleanup_failed", { code });
        }
      }
    },
  };
}

function commonFlags(cookiesFile?: string) {
  return {
    noWarnings: true,
    jsRuntimes: "node" as const,
    ...(cookiesFile ? { cookies: cookiesFile } : {}),
  };
}

function toTrack(entry: YtDlpEntry, requestedBy: string): Track | null {
  if (!entry.id || !entry.title) return null;
  const url = entry.webpage_url ??
    (entry.url?.startsWith("http") ? entry.url : `https://www.youtube.com/watch?v=${entry.id}`);
  return {
    id: entry.id,
    title: entry.title,
    url,
    durationSeconds: Math.max(0, Math.floor(entry.duration ?? 0)),
    thumbnail: entry.thumbnail,
    requestedBy,
  };
}

export async function searchYouTube(
  query: string,
  requestedBy: string,
  limit = 5,
): Promise<Track[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const directUrl = isYouTubeUrl(trimmed);
  const target = directUrl ? trimmed : `ytsearch${limit}:${trimmed}`;
  const startedAt = Date.now();
  logger.info("youtube.search.started", {
    queryType: directUrl ? "url" : "text",
    query: trimmed.slice(0, 200),
    limit,
    cookiesEnabled: Boolean(config.cookiesFile),
  });

  const runtimeCookies = prepareRuntimeCookies();
  try {
    const output = (await youtubedl(target, {
      ...commonFlags(runtimeCookies.file),
      dumpSingleJson: true,
      skipDownload: true,
      flatPlaylist: true,
      ...(directUrl ? { noPlaylist: true } : {}),
    })) as YtDlpResult;

    const entries = output.entries ?? [output];
    const tracks = entries
      .map((entry) => toTrack(entry, requestedBy))
      .filter((track): track is Track => track !== null)
      .slice(0, limit);
    logger.info("youtube.search.completed", {
      elapsedMs: Date.now() - startedAt,
      resultCount: tracks.length,
      results: tracks.map(({ id, title, durationSeconds }) => ({ id, title, durationSeconds })),
    });
    return tracks;
  } catch (error) {
    logger.error("youtube.search.failed", error, {
      elapsedMs: Date.now() - startedAt,
      queryType: directUrl ? "url" : "text",
    });
    throw error;
  } finally {
    runtimeCookies.cleanup();
  }
}

export function createYouTubeProcess(url: string) {
  if (!isYouTubeUrl(url)) {
    throw new Error("Apenas links do YouTube são permitidos.");
  }

  const runtimeCookies = prepareRuntimeCookies();
  let subprocess;
  try {
    subprocess = youtubedl.exec(url, {
      ...commonFlags(runtimeCookies.file),
      output: "-",
      format: "bestaudio/best",
      noPlaylist: true,
      quiet: true,
    });
  } catch (error) {
    runtimeCookies.cleanup();
    throw error;
  }
  subprocess.once("close", runtimeCookies.cleanup);
  subprocess.once("error", runtimeCookies.cleanup);
  logger.info("youtube.stream.spawned", {
    videoId: new URL(url).searchParams.get("v") ?? new URL(url).pathname.slice(1),
    pid: subprocess.pid,
  });
  return subprocess;
}
