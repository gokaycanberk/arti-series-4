"use client";

import { useState } from "react";

import { GameShell } from "@/components/GameShell";
import type { GameShellChildState } from "@/components/GameShell";
import RetinaCheck from "@/components/games/RetinaCheck";
import { getGameById } from "@/lib/games";

const GAME_ID = "retina-check" as const;

export default function RetinaCheckPage() {
  const game = getGameById(GAME_ID);
  /** Test döngüsü: kare → daire → üçgen */
  const [shapeRound, setShapeRound] = useState(0);

  if (!game) {
    return null;
  }

  return (
    <div className="fixed inset-0 h-screen w-screen overflow-hidden bg-[#E8E8E8]">
      <GameShell
        resetKey={`${GAME_ID}-${shapeRound}`}
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
          <RetinaCheck
            gameKey={`${GAME_ID}-${shapeRound}`}
            sequenceIndex={shapeRound}
            isPlaying={isPlaying}
            shellReady={shellReady}
            onAnswer={onAnswer}
            onGameStart={startGame}
            addRoundScore={addRoundScore}
            onGameComplete={() => setShapeRound((prev) => prev + 1)}
            round={round}
            timeLeft={timeLeft}
          />
        )}
      </GameShell>
    </div>
  );
}
