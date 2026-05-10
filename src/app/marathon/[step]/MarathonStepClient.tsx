"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { GameShell } from "@/components/GameShell";
import { PlaceholderMiniGame } from "@/components/PlaceholderMiniGame";
import { getGameByOrder } from "@/lib/games";
import { useGameStore } from "@/stores/gameStore";

interface MarathonStepClientProps {
  step: number;
}

/** Dinamik adım — sıradaki oyunu seçer ve skorları maraton dizisine iter. */
export function MarathonStepClient({ step }: MarathonStepClientProps) {
  const router = useRouter();
  const setMode = useGameStore((s) => s.setMode);
  const setCurrentGameIndex = useGameStore((s) => s.setCurrentGameIndex);
  const addMarathonScore = useGameStore((s) => s.addMarathonScore);
  const nickname = useGameStore((s) => s.nickname);

  useEffect(() => {
    setMode("marathon");
  }, [setMode]);

  useEffect(() => {
    setCurrentGameIndex(step - 1);
  }, [step, setCurrentGameIndex]);

  useEffect(() => {
    if (!nickname?.trim()) {
      router.replace("/marathon");
    }
  }, [nickname, router]);

  const game = getGameByOrder(step);

  if (!game) {
    return (
      <div className="mx-auto px-4 py-20 text-center">
        Geçersiz maraton adımı.
      </div>
    );
  }

  return (
    <GameShell
      gameName={game.name}
      description={game.description}
      duration={game.duration}
      marathonStep={step}
      onGameEnd={addMarathonScore}
    >
      {(shell) => <PlaceholderMiniGame shell={shell} gameName={game.name} />}
    </GameShell>
  );
}
