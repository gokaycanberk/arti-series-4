/**
 * Paylaşılan domain tipleri — oyunlar, skor ve oyuncu durumu.
 */

export type GameCategory = "typography" | "color" | "shape" | "structure";

export type GameDifficulty = "easy" | "medium" | "hard";

/** Mini oyun meta verisi (routing ve kartlar için). */
export interface Game {
  id: string;
  name: string;
  category: GameCategory;
  description: string;
  duration: number;
  difficulty: GameDifficulty;
  order: number;
}

export type PlayMode = "free" | "marathon";

/** Tek bir skor kaydı (ileride Supabase ile hizalanacak). */
export interface Score {
  id: string;
  nickname: string;
  gameId: string;
  value: number;
  createdAt: string;
  mode: PlayMode;
}

/** Maraton / serbest mod için oyuncu tarafı durum özeti. */
export interface PlayerState {
  nickname: string | null;
  mode: PlayMode | null;
  marathonScores: number[];
  currentGameIndex: number;
}
