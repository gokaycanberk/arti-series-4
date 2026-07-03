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

  const [pickerIndex, setPickerIndex] = useState<number | null>(urlPinnedIndex);
  const [freeIndex, setFreeIndex] = useState(0);
  const [replayKey, setReplayKey] = useState(0);

  useEffect(() => {
    if (urlPinnedIndex !== null) {
      setPickerIndex(urlPinnedIndex);
    }
  }, [urlPinnedIndex]);

  const charIndex = pickerIndex ?? freeIndex;
  const isPinned = pickerIndex !== null;
  const activeChar = BEZIER_CHARACTERS[charIndex]!;

  if (!game) {
    return null;
  }

  return (
    <div className="fixed inset-0 h-screen w-screen overflow-hidden bg-[#E8E8E8]">
      <div
        className="absolute bottom-4 left-4 z-80 flex items-center gap-1 rounded-full border border-[#1A1A1A] bg-white/95 px-2 py-1.5 shadow-sm backdrop-blur-sm"
        aria-label="Test character picker"
      >
        {BEZIER_CHARACTERS.map((char, index) => {
          const active = charIndex === index;
          return (
            <button
              key={char.id}
              type="button"
              onClick={() => {
                setPickerIndex(index);
                setReplayKey((k) => k + 1);
              }}
              className="rounded-full border px-3 py-1 text-sm transition-colors"
              style={{
                fontFamily: "var(--font-planc), serif",
                fontWeight: active ? 700 : 500,
                borderColor: active ? "#1A1A1A" : "transparent",
                backgroundColor: active ? "#E5E5E5" : "transparent",
                color: "#1A1A1A",
              }}
            >
              {char.label}
            </button>
          );
        })}
        {isPinned && (
          <button
            type="button"
            onClick={() => {
              setPickerIndex(null);
              setReplayKey((k) => k + 1);
            }}
            className="ml-1 rounded-full px-2 py-1 text-xs text-[#666]"
            style={{ fontFamily: "var(--font-planc), serif" }}
          >
            Sıra
          </button>
        )}
      </div>

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
              if (isPinned) {
                setReplayKey((k) => k + 1);
                return;
              }
              setFreeIndex((prev) => prev + 1);
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
