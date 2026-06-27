"use client";

import { useCallback, useState } from "react";
import ColorPicker from "@/components/ColorPicker";
import { GameShell } from "@/components/GameShell";
import type { GameShellChildState } from "@/components/GameShell";
import OpticalPanic from "@/components/games/OpticalPanic";
import RetinaCheck from "@/components/games/RetinaCheck";
import BezierBrain from "@/components/games/BezierBrain";
import GradientGuru from "@/components/games/GradientGuru";
import UntitledProject from "@/components/games/UntitledProject";
import { computeMarathonStep } from "@/lib/marathon";
import { getGameById } from "@/lib/games";

type Phase = "picking" | "transitioning" | "game";

type MarathonEntry = {
  resetKey: string;
  name: string;
  duration: number;
  /** İlk 4 oyun 3'er tur, son oyun 1 tur */
  repeats: number;
  Component: React.ComponentType<{
    gameKey: string;
    isPlaying: boolean;
    shellReady: boolean;
    onAnswer: (correct: boolean) => void;
    onGameStart: () => void;
    addRoundScore: (points: number) => void;
    onGameComplete?: () => void;
    round: number;
    timeLeft: number;
  }>;
};

/**
 * Maraton sırası — 5 ana oyun.
 * İlk 4 oyun 3'er kez (açılış animasyonu ile), 5. oyun tek tur zamana karşı.
 */
const MARATHON_GAMES: MarathonEntry[] = [
  {
    resetKey: "optical-panic",
    name: "OPTICAL PANIC",
    duration: 30,
    repeats: 3,
    Component: OpticalPanic,
  },
  {
    resetKey: "retina-check",
    name: "RETINA CHECK",
    duration: 30,
    repeats: 3,
    Component: RetinaCheck,
  },
  {
    resetKey: "bezier-brain",
    name: "BEZIER BRAIN",
    duration: 60,
    repeats: 3,
    Component: BezierBrain,
  },
  {
    resetKey: "gradient-guru",
    name: "GRADIENT GURU",
    duration: 45,
    repeats: 3,
    Component: GradientGuru,
  },
  {
    resetKey: "untitled-project",
    name: "UNTITLED-1",
    duration: 60,
    repeats: 1,
    Component: UntitledProject,
  },
];

/**
 * Hızlı test: `.env.local` içine `NEXT_PUBLIC_MARATHON_START_INDEX=3` yaz
 * (0=Optical, 1=Retina, 2=Bezier, 3=Gradient).
 */
function getMarathonStart() {
  const raw = Number(process.env.NEXT_PUBLIC_MARATHON_START_INDEX ?? 0);
  if (!Number.isFinite(raw)) return { gameIndex: 0, attemptIndex: 0 };
  const gameIndex = Math.min(
    Math.max(0, Math.floor(raw)),
    MARATHON_GAMES.length - 1,
  );
  return { gameIndex, attemptIndex: 0 };
}

export default function OnboardingPage() {
  const start = getMarathonStart();
  const [phase, setPhase] = useState<Phase>("picking");
  const [gameIndex, setGameIndex] = useState(start.gameIndex);
  const [attemptIndex, setAttemptIndex] = useState(start.attemptIndex);
  const [completedRounds, setCompletedRounds] = useState(() =>
    computeMarathonStep(start.gameIndex, start.attemptIndex),
  );
  const [marathonScore, setMarathonScore] = useState(0);

  const activeGame = MARATHON_GAMES[gameIndex] ?? MARATHON_GAMES[0]!;
  const activeGameMeta = getGameById(activeGame.resetKey);
  const ActiveComponent = activeGame.Component;

  const handleScoreAdd = useCallback((points: number) => {
    setMarathonScore((prev) => prev + points);
  }, []);

  const handleTransitionStart = () => {
    setPhase("transitioning");
  };

  const handleTransitionComplete = () => {
    setPhase("game");
  };

  const handleGameComplete = useCallback(() => {
    const game = MARATHON_GAMES[gameIndex];
    if (!game) return;

    setCompletedRounds((prev) => prev + 1);

    const nextAttempt = attemptIndex + 1;

    if (nextAttempt < game.repeats) {
      setAttemptIndex(nextAttempt);
      return;
    }

    if (gameIndex < MARATHON_GAMES.length - 1) {
      setGameIndex((prev) => prev + 1);
      setAttemptIndex(0);
    }
  }, [gameIndex, attemptIndex]);

  return (
    <div className="fixed inset-0 h-screen w-screen overflow-hidden bg-[#E8E8E8]">
      <div
        id="flash-overlay"
        className="fixed inset-0 z-[9999] pointer-events-none"
        style={{ backgroundColor: "white", opacity: 0 }}
      />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        id="face-reveal"
        src="/Avatar_Set/face/face.png"
        alt="face"
        className="fixed z-[9998] pointer-events-none"
        style={{
          width: "160px",
          height: "160px",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) scale(0)",
          opacity: 0,
          borderRadius: "50%",
        }}
      />

      {(phase === "picking" || phase === "transitioning") && (
        <ColorPicker
          onTransitionStart={handleTransitionStart}
          onTransitionComplete={handleTransitionComplete}
          isTransitioning={phase === "transitioning"}
        />
      )}

      {phase === "game" && (
        <GameShell
          key={`marathon-${gameIndex}-${attemptIndex}`}
          resetKey={`${activeGame.resetKey}-${gameIndex}-${attemptIndex}`}
          gameName={activeGame.name}
          description={activeGameMeta?.description}
          duration={activeGame.duration}
          marathonStep={completedRounds}
          initialScore={marathonScore}
          onScoreAdd={handleScoreAdd}
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
            <ActiveComponent
              key={`${activeGame.resetKey}-${attemptIndex}`}
              gameKey={activeGame.resetKey}
              isPlaying={isPlaying}
              shellReady={shellReady}
              onAnswer={onAnswer}
              onGameStart={startGame}
              addRoundScore={addRoundScore}
              onGameComplete={handleGameComplete}
              round={round}
              timeLeft={timeLeft}
              {...(activeGame.resetKey === "untitled-project"
                ? { endGame }
                : {})}
            />
          )}
        </GameShell>
      )}
    </div>
  );
}
