import { randomInt } from "node:crypto";
import type { Track } from "./youtube.js";

interface RandomGenre {
  name: string;
  value: string;
  searches: readonly string[];
}

export const RANDOM_GENRES = [
  { name: "Rock", value: "rock", searches: ["rock music", "classic rock music", "alternative rock music", "rock anos 80"] },
  { name: "Pop", value: "pop", searches: ["pop music", "pop hits", "indie pop music", "pop anos 2000"] },
  { name: "Hip-hop", value: "hip-hop", searches: ["hip hop music", "rap music", "old school hip hop", "alternative hip hop"] },
  { name: "Eletrônica", value: "eletronica", searches: ["electronic music", "dance music", "house music", "electronic music mix"] },
  { name: "Metal", value: "metal", searches: ["metal music", "heavy metal music", "power metal music", "alternative metal"] },
  { name: "MPB", value: "mpb", searches: ["MPB música", "clássicos da MPB", "nova MPB", "MPB anos 80"] },
  { name: "Sertanejo", value: "sertanejo", searches: ["música sertaneja", "sertanejo universitário", "sertanejo raiz", "modão sertanejo"] },
  { name: "Lo-fi", value: "lo-fi", searches: ["lofi music", "lofi hip hop", "lofi beats", "chillhop music"] },
  { name: "Jazz", value: "jazz", searches: ["jazz music", "smooth jazz", "bebop jazz", "vocal jazz"] },
  { name: "Clássica", value: "classica", searches: ["classical music", "música clássica", "baroque music", "romantic classical music"] },
] as const satisfies readonly RandomGenre[];

const MAX_RANDOM_TRACK_DURATION_SECONDS = 20 * 60;

export function getRandomGenre(value: string): RandomGenre | undefined {
  return RANDOM_GENRES.find((genre) => genre.value === value);
}

export function buildRandomSearch(genre: RandomGenre): string {
  return genre.searches[randomInt(genre.searches.length)] ?? genre.searches[0];
}

export function selectRandomTracks(tracks: Track[], quantity: number): Track[] {
  const unique = [...new Map(
    tracks
      .filter((track) =>
        !track.isLive &&
        track.durationSeconds > 0 &&
        track.durationSeconds <= MAX_RANDOM_TRACK_DURATION_SECONDS)
      .map((track) => [track.id, track]),
  ).values()];

  for (let index = unique.length - 1; index > 0; index -= 1) {
    const otherIndex = randomInt(index + 1);
    [unique[index], unique[otherIndex]] = [unique[otherIndex]!, unique[index]!];
  }

  return unique.slice(0, quantity);
}
