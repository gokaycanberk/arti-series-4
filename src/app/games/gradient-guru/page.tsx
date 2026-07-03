"use client";

import { useMemo, useState } from "react";

import { GameShell } from "@/components/GameShell";
import type { GameShellChildState } from "@/components/GameShell";
import GradientGuru from "@/components/games/GradientGuru";
import { getGameById } from "@/lib/games";
import { pickGradientGuruSession } from "@/lib/gradientGuruVariations";

const GAME_ID = "gradient-guru" as const;

export default function GradientGuruPage() {
  const game = getGameById(GAME_ID);
  const [roundIndex, setRoundIndex] = useState(0);
  const sessionPicks = useMemo(() => pickGradientGuruSession(), []);

  if (!game) {
    return null;
  }

  return (
    <div className="fixed inset-0 h-screen w-screen overflow-hidden bg-[#E8E8E8]">
      <GameShell
        resetKey={`${GAME_ID}-${roundIndex}`}
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
            gameKey={`${GAME_ID}-${roundIndex}`}
            sequenceIndex={roundIndex}
            sessionPicks={sessionPicks}
            isPlaying={isPlaying}
            shellReady={shellReady}
            onAnswer={onAnswer}
            onGameStart={startGame}
            addRoundScore={addRoundScore}
            onGameComplete={() => setRoundIndex((prev) => prev + 1)}
            round={round}
            timeLeft={timeLeft}
          />
        )}
      </GameShell>
    </div>
  );
}
