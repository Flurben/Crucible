import type { AiDifficulty, Command, PlayerId, TickCommands } from "../sim/types.ts";

export type ClientMsg =
  | { t: "hello"; name: string; token?: string }
  | { t: "queue"; ranked: boolean }
  | { t: "cancelQueue" }
  | { t: "cmds"; tick: number; cmds: Command[] }
  | { t: "hash"; tick: number; hash: number }
  | { t: "surrender" }
  | { t: "ping"; n: number };

export type ServerMsg =
  | { t: "welcome"; playerId: string; name: string; rating: number }
  | { t: "queued"; ranked: boolean }
  | { t: "match"; matchId: string; seed: number; you: PlayerId; opponent: string; opponentRating: number; ranked: boolean }
  | { t: "cmds"; tick: number; p0: Command[]; p1: Command[] }
  | { t: "hashOk"; tick: number }
  | { t: "desync"; tick: number }
  | { t: "end"; winner: PlayerId; reason: "keep" | "surrender" | "disconnect"; ratingDelta?: number }
  | { t: "pong"; n: number; serverTime: number }
  | { t: "error"; message: string };

export interface RatingRecord {
  id: string;
  name: string;
  rating: number;
  wins: number;
  losses: number;
}

export const DEFAULT_RATING = 1000;
export const K_FACTOR = 32;

export function eloDelta(a: number, b: number, score: 0 | 1): number {
  const expected = 1 / (1 + Math.pow(10, (b - a) / 400));
  return Math.round(K_FACTOR * (score - expected));
}

export type { AiDifficulty, Command, PlayerId, TickCommands };
