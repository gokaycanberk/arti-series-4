"use client";

import { useState } from "react";

import { GameShell } from "@/components/GameShell";
import type { GameShellChildState } from "@/components/GameShell";
import BezierBrain from "@/components/games/BezierBrain";
import { getGameById } from "@/lib/games";

const GAME_ID = "bezier-brain" as const;

export default function BezierBrainPage() {
  const game = getGameById(GAME_ID);
  /** Test döngüsü: S → 2 → … */
  const [charIndex, setCharIndex] = useState(0);

  if (!game) {
    return null;
  }

  return (
    <div className="fixed inset-0 h-screen w-screen overflow-hidden bg-[#E8E8E8]">
      <GameShell
        resetKey={`${GAME_ID}-${charIndex}`}
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
          <BezierBrain
            gameKey={`${GAME_ID}-${charIndex}`}
            sequenceIndex={charIndex}
            isPlaying={isPlaying}
            shellReady={shellReady}
            onAnswer={onAnswer}
            onGameStart={startGame}
            addRoundScore={addRoundScore}
            onGameComplete={() => setCharIndex((prev) => prev + 1)}
            round={round}
            timeLeft={timeLeft}
          />
        )}
      </GameShell>
    </div>
  );
}
