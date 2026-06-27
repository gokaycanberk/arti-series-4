"use client";

import { GameShell } from "@/components/GameShell";
import type { GameShellChildState } from "@/components/GameShell";
import UntitledProject from "@/components/games/UntitledProject";
import { getGameById } from "@/lib/games";

const GAME_ID = "untitled-project" as const;

export default function UntitledProjectPage() {
  const game = getGameById(GAME_ID);

  if (!game) {
    return (
      <div className="mx-auto px-4 py-20 text-center text-sm">
        Oyun bulunamadı.
      </div>
    );
  }

  return (
    <div className="fixed inset-0 h-screen w-screen overflow-hidden bg-[#E8E8E8]">
      <GameShell
        resetKey={GAME_ID}
        gameName={game.name}
        description={game.description}
        duration={game.duration}
      >
        {({
          isPlaying,
          shellReady,
          onAnswer,
          addRoundScore,
          endGame,
          startGame,
          round,
          timeLeft,
        }: GameShellChildState) => (
          <UntitledProject
            gameKey={GAME_ID}
            isPlaying={isPlaying}
            shellReady={shellReady}
            onAnswer={onAnswer}
            onGameStart={startGame}
            addRoundScore={addRoundScore}
            endGame={endGame}
            round={round}
            timeLeft={timeLeft}
          />
        )}
      </GameShell>
    </div>
  );
}
