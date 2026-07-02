"use client";

import { useState } from "react";

import { GameShell } from "@/components/GameShell";
import type { GameShellChildState } from "@/components/GameShell";
import OpticalPanic from "@/components/games/OpticalPanic";
import { getGameById } from "@/lib/games";

const GAME_ID = "optical-panic" as const;

export default function OpticalPanicPage() {
  const game = getGameById(GAME_ID);
  /** Test döngüsü: MIND → HEART → FLAIR */
  const [wordRound, setWordRound] = useState(0);

  if (!game) {
    return null;
  }

  return (
    <div className="fixed inset-0 h-screen w-screen overflow-hidden bg-[#E8E8E8]">
      <GameShell
        resetKey={`${GAME_ID}-${wordRound}`}
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
          <OpticalPanic
            gameKey={`${GAME_ID}-${wordRound}`}
            sequenceIndex={wordRound}
            isPlaying={isPlaying}
            shellReady={shellReady}
            onAnswer={onAnswer}
            onGameStart={startGame}
            addRoundScore={addRoundScore}
            onGameComplete={() => setWordRound((prev) => prev + 1)}
            round={round}
            timeLeft={timeLeft}
          />
        )}
      </GameShell>
    </div>
  );
}
