"use client";

import { useCallback, useState } from "react";

export type GamePhase = "idle" | "playing" | "finished";

/** Basit faz + skor yönetimi — canvas oyunları bu kancayı genişletebilir. */
export function useGameState(initialScore = 0) {
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [score, setScore] = useState(initialScore);

  const startPlaying = useCallback(() => setPhase("playing"), []);
  const finish = useCallback(() => setPhase("finished"), []);
  const reset = useCallback(() => {
    setPhase("idle");
    setScore(initialScore);
  }, [initialScore]);

  return {
    phase,
    score,
    setScore,
    startPlaying,
    finish,
    reset,
    setPhase,
  };
}
