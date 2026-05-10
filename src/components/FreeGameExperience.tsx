"use client";

import { useEffect } from "react";

import { GameShell } from "@/components/GameShell";
import { PlaceholderMiniGame } from "@/components/PlaceholderMiniGame";
import { getGameById } from "@/lib/games";
import { useGameStore } from "@/stores/gameStore";

interface FreeGameExperienceProps {
  gameId: string;
}

/** Serbest modda paylaşılan bileşim — kartlardan gelindiğinde `mode=free` olarak işaretler. */
export function FreeGameExperience({ gameId }: FreeGameExperienceProps) {
  const setMode = useGameStore((s) => s.setMode);

  useEffect(() => {
    setMode("free");
  }, [setMode]);

  const game = getGameById(gameId);

  if (!game) {
    return (
      <div className="mx-auto px-4 py-24 text-center text-sm text-foreground/60">
        Oyun bulunamadı ({gameId}). Slug doğrulanana kadar rota bağlanmadı.
      </div>
    );
  }

  return (
    <GameShell gameName={game.name} description={game.description} duration={game.duration}>
      {(shell) => <PlaceholderMiniGame shell={shell} gameName={game.name} />}
    </GameShell>
  );
}
