import { create } from "zustand";
import type { AiDifficulty, MatchConfig, PlayerId } from "@crucible/shared";

export type Screen =
  | "main-menu"
  | "play-menu"
  | "queuing"
  | "game"
  | "tutorial"
  | "replay"
  | "post-game";

export interface PostGameResult {
  winner: PlayerId;
  localPlayer: PlayerId;
  reason: string;
  ratingDelta?: number;
}

interface AppState {
  screen: Screen;
  matchConfig: MatchConfig | null;
  postGame: PostGameResult | null;
  playerName: string;
  playerRating: number;
  latestSeed: number;
  setScreen: (s: Screen) => void;
  startGame: (cfg: MatchConfig) => void;
  endGame: (result: PostGameResult) => void;
  setName: (name: string) => void;
  setRating: (r: number) => void;
  nextSeed: () => number;
}

export const useAppStore = create<AppState>((set) => ({
  screen: "main-menu",
  matchConfig: null,
  postGame: null,
  playerName: (() => {
    const saved = localStorage.getItem("crucible_name");
    return saved || "Commander";
  })(),
  playerRating: Number(localStorage.getItem("crucible_rating") || 1000),
  latestSeed: Math.floor(Math.random() * 0xffffffff),

  setScreen: (screen) => set({ screen }),

  startGame: (matchConfig) =>
    set({ matchConfig, screen: "game", postGame: null }),

  endGame: (result) =>
    set({ postGame: result, screen: "post-game" }),

  setName: (name) => {
    localStorage.setItem("crucible_name", name);
    set({ playerName: name });
  },

  setRating: (r) => {
    localStorage.setItem("crucible_rating", String(r));
    set({ playerRating: r });
  },

  nextSeed: () => {
    const seed = Math.floor(Math.random() * 0xffffffff);
    set({ latestSeed: seed });
    return seed;
  },
}));

export type { AiDifficulty, MatchConfig, PlayerId };
