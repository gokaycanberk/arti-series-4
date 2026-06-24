"use client";

import { GameShell } from "@/components/GameShell";
import type { GameShellChildState } from "@/components/GameShell";
import GradientGuru from "@/components/games/GradientGuru";
import { getGameById } from "@/lib/games";

const GAME_ID = "gradient-guru" as const;

export default function GradientGuruPage() {
  const game = getGameById(GAME_ID);

  if (!game) {
    return null;
  }

  return (
    <div className="fixed inset-0 h-screen w-screen overflow-hidden bg-[#E8E8E8]">
      <GameShell
        resetKey={GAME_ID}
        gameName={game.name}
        duration={game.duration}
      >
        {({
          isPlaying,
          shellReady,
          onAnswer,
          addRoundScore,
          startGame,
          round,
          timeLeft,
        }: GameShellChildState) => (
          <GradientGuru
            gameKey={GAME_ID}
            isPlaying={isPlaying}
            shellReady={shellReady}
            onAnswer={onAnswer}
            onGameStart={startGame}
            addRoundScore={addRoundScore}
            round={round}
            timeLeft={timeLeft}
          />
        )}
      </GameShell>
    </div>
  );
}
