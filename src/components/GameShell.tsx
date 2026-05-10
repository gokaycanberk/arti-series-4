"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";

import { useTimer } from "@/hooks/useTimer";
import { TOTAL_GAMES } from "@/lib/games";
import { clampScore, generatePlaceholderScore } from "@/lib/scoring";
import { selectMarathonAverage, useGameStore } from "@/stores/gameStore";
import type { PlayMode } from "@/types";

import { MarathonTransition } from "./MarathonTransition";
import { ScoreDisplay } from "./ScoreDisplay";
import { Timer } from "./Timer";

export type GameShellChildState = {
  isPlaying: boolean;
  timeLeft: number;
  endGame: (score: number) => void;
  /**
   * Süre doğal bittiğinde kullanılacak güncel skoru döndüren fonksiyonu kaydeder.
   * Verilmezse timer sonunda placeholder skor kullanılır.
   */
  setLiveScoreGetter?: (getter: () => number) => void;
};

type Phase = "intro" | "playing" | "finished";

interface GameShellProps {
  /** Benzersiz sıfırlama için üst bileşenden `gameId`/adım kombinasyonu geçilir. */
  resetKey?: string;
  gameName: string;
  description?: string;
  duration?: number;
  onGameEnd?: (score: number) => void;
  /** Maraton akışında 1 tabanlı adım — verildiğinde maraton UI ve yönlendirme aktif olur. */
  marathonStep?: number;
  children: (state: GameShellChildState) => React.ReactNode;
}

/**
 * Ortak oyun sarayı — intro, zaman çubuğu + timer, çocuk (canvas vb.) ve skor özetini yönetir.
 * `resetKey` değiştikçe shell yeniden oluşturulur (yan etkisiz sıfırlama).
 */
export function GameShell({
  resetKey,
  gameName,
  description,
  duration = 30,
  onGameEnd,
  marathonStep,
  children,
}: GameShellProps) {
  const router = useRouter();
  const mode = useGameStore((s) => s.mode);
  const nextGame = useGameStore((s) => s.nextGame);
  const marathonAverage = useGameStore(selectMarathonAverage);

  const shellKey =
    resetKey ?? `${gameName}-${duration}-${marathonStep ?? "solo"}`;

  return (
    <GameShellInner
      key={shellKey}
      gameName={gameName}
      description={description}
      duration={duration}
      marathonStep={marathonStep}
      onGameEnd={onGameEnd}
      mode={mode}
      nextGame={nextGame}
      marathonAverage={marathonAverage}
      router={router}
    >
      {children}
    </GameShellInner>
  );
}

function GameShellInner({
  gameName,
  description,
  duration = 30,
  onGameEnd,
  marathonStep,
  children,
  mode,
  nextGame,
  marathonAverage,
  router,
}: Omit<GameShellProps, "resetKey"> & {
  mode: PlayMode | null;
  nextGame: () => void;
  marathonAverage: number;
  router: ReturnType<typeof useRouter>;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [finalScore, setFinalScore] = useState(0);
  const endedRef = useRef(false);
  const liveScoreGetterRef = useRef<(() => number) | null>(null);

  const isMarathon = mode === "marathon" && marathonStep != null;

  const setLiveScoreGetter = useCallback((getter: () => number) => {
    liveScoreGetterRef.current = getter;
  }, []);

  const finishGame = useCallback(
    (rawScore: number) => {
      if (endedRef.current) return;
      endedRef.current = true;
      liveScoreGetterRef.current = null;

      const safe = clampScore(rawScore);
      setFinalScore(safe);
      setPhase("finished");
      onGameEnd?.(safe);
    },
    [onGameEnd],
  );

  const handleTimerFinish = useCallback(() => {
    if (endedRef.current) return;
    const getter = liveScoreGetterRef.current;
    if (getter) {
      try {
        const raw = getter();
        if (typeof raw === "number" && !Number.isNaN(raw)) {
          finishGame(raw);
          return;
        }
      } catch {
        /* fallthrough to placeholder */
      }
    }
    finishGame(generatePlaceholderScore());
  }, [finishGame]);

  const { startTimer, stopTimer, resetTimer, timeLeft } = useTimer({
    onFinish: handleTimerFinish,
  });

  const handleStart = () => {
    endedRef.current = false;
    liveScoreGetterRef.current = null;
    resetTimer();
    stopTimer();
    setPhase("playing");
    startTimer(duration);
  };

  const handleReplay = () => {
    endedRef.current = false;
    liveScoreGetterRef.current = null;
    resetTimer();
    stopTimer();
    setPhase("intro");
    setFinalScore(0);
  };

  const handleMarathonContinue = () => {
    if (marathonStep == null) return;
    nextGame();

    const isLastRound = marathonStep >= TOTAL_GAMES;
    if (isLastRound) {
      router.push("/leaderboard");
      return;
    }

    router.push(`/marathon/${marathonStep + 1}`);
  };

  const progress =
    duration > 0 ? Math.max(0, Math.min(1, timeLeft / duration)) : 0;

  const endEarly = useCallback(
    (score: number) => {
      stopTimer();
      finishGame(score);
    },
    [finishGame, stopTimer],
  );

  const childState = useMemo<GameShellChildState>(
    () => ({
      isPlaying: phase === "playing",
      timeLeft,
      endGame: endEarly,
      setLiveScoreGetter,
    }),
    [endEarly, phase, timeLeft, setLiveScoreGetter],
  );

  return (
    <div className="mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-4xl flex-col px-4 py-12">
      {phase === "intro" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-foreground/50">
            Artı Series 4
          </p>
          <h1 className="max-w-xl text-balance text-4xl font-semibold tracking-tight">
            {gameName}
          </h1>
          {description ? (
            <p className="max-w-lg text-lg text-foreground/60">{description}</p>
          ) : null}
          <button
            type="button"
            onClick={handleStart}
            className="mt-6 rounded-full bg-foreground px-10 py-3 text-sm font-medium text-background transition hover:opacity-90"
          >
            Başla
          </button>
        </div>
      )}

      {phase === "playing" && (
        <div className="flex flex-1 flex-col gap-8">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-foreground/70">{gameName}</p>
              <Timer seconds={timeLeft} />
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-subtle">
              <div
                className="h-full rounded-full bg-foreground transition-all duration-1000 ease-linear"
                style={{ width: `${progress * 100}%` }}
                aria-valuenow={timeLeft}
                aria-valuemin={0}
                aria-valuemax={duration}
                role="progressbar"
              />
            </div>
          </div>

          <div className="flex flex-1 flex-col">
            {/* eslint-disable-next-line react-hooks/refs */}
            {children(childState)}
          </div>
        </div>
      )}

      {phase === "finished" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-10 py-16">
          {isMarathon && marathonStep != null ? (
            <MarathonTransition
              roundLabel={marathonStep}
              totalRounds={TOTAL_GAMES}
              averageSoFar={marathonAverage}
            />
          ) : null}
          <ScoreDisplay
            score={finalScore}
            isMarathon={Boolean(isMarathon)}
            onMarathonNext={handleMarathonContinue}
            onReplay={handleReplay}
            onHome={() => router.push("/")}
          />
        </div>
      )}
    </div>
  );
}
