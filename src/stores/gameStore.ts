"use client";

import { create } from "zustand";

import { TOTAL_GAMES } from "@/lib/games";
import { averageScores } from "@/lib/scoring";
import type { PlayMode } from "@/types";

const NICKNAME_STORAGE_KEY = "arti-series-4-nickname";

export interface GameStoreState {
  nickname: string | null;
  mode: PlayMode | null;
  marathonScores: number[];
  currentGameIndex: number;
  setNickname: (name: string) => void;
  hydrateNicknameFromStorage: () => void;
  setMode: (mode: PlayMode) => void;
  addMarathonScore: (score: number) => void;
  nextGame: () => void;
  resetMarathon: () => void;
  setCurrentGameIndex: (index: number) => void;
}

/** Maraton toplamları için türetilmiş ortalama (spec: totalMarathonScore ≈ ortalama). */
export function selectMarathonAverage(state: GameStoreState): number {
  return averageScores(state.marathonScores);
}

export const selectTotalMarathonScore = selectMarathonAverage;

export const useGameStore = create<GameStoreState>((set) => ({
  nickname: null,
  mode: null,
  marathonScores: [],
  currentGameIndex: 0,

  setNickname: (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(NICKNAME_STORAGE_KEY, trimmed);
    }
    set({ nickname: trimmed });
  },

  hydrateNicknameFromStorage: () => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(NICKNAME_STORAGE_KEY);
    if (stored?.trim()) {
      set({ nickname: stored.trim() });
    }
  },

  setMode: (mode: PlayMode) => set({ mode }),

  addMarathonScore: (score: number) =>
    set((s) => ({ marathonScores: [...s.marathonScores, score] })),

  nextGame: () =>
    set((s) => ({
      currentGameIndex: Math.min(s.currentGameIndex + 1, TOTAL_GAMES - 1),
    })),

  resetMarathon: () =>
    set({
      marathonScores: [],
      currentGameIndex: 0,
    }),

  setCurrentGameIndex: (index: number) =>
    set({ currentGameIndex: Math.max(0, Math.floor(index)) }),
}));

export { NICKNAME_STORAGE_KEY };
