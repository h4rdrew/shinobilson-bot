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

function commonFlags() {
  return {
    noWarnings: true,
    noCallHome: true,
    ...(config.cookiesFile ? { cookies: config.cookiesFile } : {}),
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

  try {
    const output = (await youtubedl(target, {
      ...commonFlags(),
      dumpSingleJson: true,
      skipDownload: true,
      flatPlaylist: true,
      noPlaylist: directUrl,
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
  }
}

export function createYouTubeProcess(url: string) {
  if (!isYouTubeUrl(url)) {
    throw new Error("Apenas links do YouTube são permitidos.");
  }

  const subprocess = youtubedl.exec(url, {
    ...commonFlags(),
    output: "-",
    format: "bestaudio/best",
    noPlaylist: true,
    quiet: true,
  });
  logger.info("youtube.stream.spawned", {
    videoId: new URL(url).searchParams.get("v") ?? new URL(url).pathname.slice(1),
    pid: subprocess.pid,
  });
  return subprocess;
}
