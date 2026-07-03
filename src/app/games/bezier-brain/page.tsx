"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { GameShell } from "@/components/GameShell";
import type { GameShellChildState } from "@/components/GameShell";
import BezierBrain from "@/components/games/BezierBrain";
import { getGameById } from "@/lib/games";
import {
  BEZIER_CHARACTERS,
  resolveBezierCharacterIndex,
} from "@/lib/bezierBrainVariations";

const GAME_ID = "bezier-brain" as const;

function BezierBrainPageContent() {
  const game = getGameById(GAME_ID);
  const searchParams = useSearchParams();

  const urlPinnedIndex = useMemo(() => {
    const byChar = resolveBezierCharacterIndex(searchParams.get("char"));
    if (byChar !== null) return byChar;
    return resolveBezierCharacterIndex(searchParams.get("index"));
  }, [searchParams]);

  const [roundIndex, setRoundIndex] = useState(0);
  const [replayKey, setReplayKey] = useState(0);

  useEffect(() => {
    if (urlPinnedIndex !== null) {
      setRoundIndex(urlPinnedIndex);
      setReplayKey((k) => k + 1);
    }
  }, [urlPinnedIndex]);

  const charIndex =
    urlPinnedIndex ??
    ((roundIndex % BEZIER_CHARACTERS.length) + BEZIER_CHARACTERS.length) %
      BEZIER_CHARACTERS.length;
  const activeChar = BEZIER_CHARACTERS[charIndex]!;

  if (!game) {
    return null;
  }

  return (
    <div className="fixed inset-0 h-screen w-screen overflow-hidden bg-[#E8E8E8]">
      <GameShell
        resetKey={`${GAME_ID}-${charIndex}-${replayKey}`}
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
            gameKey={`${GAME_ID}-${activeChar.id}-${replayKey}`}
            sequenceIndex={charIndex}
            isPlaying={isPlaying}
            shellReady={shellReady}
            onAnswer={onAnswer}
            onGameStart={startGame}
            addRoundScore={addRoundScore}
            onGameComplete={() => {
              if (urlPinnedIndex !== null) {
                setReplayKey((k) => k + 1);
                return;
              }
              setRoundIndex((prev) => prev + 1);
            }}
            round={round}
            timeLeft={timeLeft}
          />
        )}
      </GameShell>
    </div>
  );
}

export default function BezierBrainPage() {
  return (
    <Suspense fallback={null}>
      <BezierBrainPageContent />
    </Suspense>
  );
}
