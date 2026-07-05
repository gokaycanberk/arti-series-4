"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ColorPicker from "@/components/ColorPicker";
import { GameShell } from "@/components/GameShell";
import type { GameShellChildState } from "@/components/GameShell";
import OpticalPanic from "@/components/games/OpticalPanic";
import RetinaCheck from "@/components/games/RetinaCheck";
import BezierBrain from "@/components/games/BezierBrain";
import GradientGuru from "@/components/games/GradientGuru";
import UntitledProject from "@/components/games/UntitledProject";
import { MarathonResults } from "@/components/marathon-results/MarathonResults";
import { computeMarathonStep, getMarathonRepeats } from "@/lib/marathon";
import { getMarathonDevConfig } from "@/lib/marathonDev";
import { pickGradientGuruSession } from "@/lib/gradientGuruVariations";
import { useGameStore } from "@/stores/gameStore";

type Phase = "picking" | "transitioning" | "game" | "results";

type MarathonEntry = {
  resetKey: string;
  name: string;
  duration: number;
  Component: React.ComponentType<{
    gameKey: string;
    isPlaying: boolean;
    shellReady: boolean;
    onAnswer: (correct: boolean) => void;
    onGameStart: () => void;
    onIntroComplete: () => void;
    addRoundScore: (points: number) => void;
    onGameComplete?: () => void;
    round: number;
    timeLeft: number;
    sequenceIndex?: number;
    sessionPicks?: readonly number[];
  }>;
};

/** Maraton sırası — avatar seçimi sonrası 4 oyun ×3, Untitled ×1 (30 sn). */
const MARATHON_GAMES: MarathonEntry[] = [
  {
    resetKey: "optical-panic",
    name: "OPTICAL PANIC",
    duration: 30,
    Component: OpticalPanic,
  },
  {
    resetKey: "retina-check",
    name: "RETINA CHECK",
    duration: 30,
    Component: RetinaCheck,
  },
  {
    resetKey: "bezier-brain",
    name: "BEZIER BRAIN",
    duration: 60,
    Component: BezierBrain,
  },
  {
    resetKey: "gradient-guru",
    name: "GRADIENT GURU",
    duration: 45,
    Component: GradientGuru,
  },
  {
    resetKey: "untitled-project",
    name: "UNTITLED-1",
    duration: 30,
    Component: UntitledProject,
  },
];

const MARATHON_DEV = getMarathonDevConfig(MARATHON_GAMES.length);

function getInitialPhase(): Phase {
  if (MARATHON_DEV.skipToResults) return "results";
  if (MARATHON_DEV.startAtGame) return "game";
  return "picking";
}

export default function OnboardingPage() {
  const lastGameIndex = MARATHON_GAMES.length - 1;
  const devStartIndex = MARATHON_DEV.skipToResults
    ? lastGameIndex
    : MARATHON_DEV.startGameIndex;

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [gameIndex, setGameIndex] = useState(devStartIndex);
  const [attemptIndex, setAttemptIndex] = useState(0);
  const [completedRounds, setCompletedRounds] = useState(() => {
    if (MARATHON_DEV.skipToResults) return MARATHON_GAMES.length;
    if (MARATHON_DEV.startAtGame) return devStartIndex;
    return computeMarathonStep(devStartIndex, 0);
  });
  const [marathonScore, setMarathonScore] = useState(() => {
    if (MARATHON_DEV.skipToResults || MARATHON_DEV.startAtGame) {
      return MARATHON_DEV.mockScore;
    }
    return 0;
  });
  const marathonScoreRef = useRef(
    MARATHON_DEV.skipToResults || MARATHON_DEV.startAtGame
      ? MARATHON_DEV.mockScore
      : 0,
  );
  const [gradientSessionPicks, setGradientSessionPicks] = useState(() =>
    pickGradientGuruSession(),
  );

  useEffect(() => {
    useGameStore.getState().hydrateNicknameFromStorage();
    useGameStore.getState().pickAvatarFace();
  }, []);

  const activeGame = MARATHON_GAMES[gameIndex] ?? MARATHON_GAMES[0]!;
  const ActiveComponent = activeGame.Component;
  const avatarFaceSrc = useGameStore((s) => s.avatarFaceSrc);

  const handleScoreAdd = useCallback((points: number) => {
    setMarathonScore((prev) => {
      const next = prev + points;
      marathonScoreRef.current = next;
      return next;
    });
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

    const repeats = getMarathonRepeats(gameIndex);
    const nextAttempt = attemptIndex + 1;

    if (nextAttempt < repeats) {
      setAttemptIndex(nextAttempt);
      return;
    }

    if (gameIndex < MARATHON_GAMES.length - 1) {
      const nextIndex = gameIndex + 1;
      if (MARATHON_GAMES[nextIndex]?.resetKey === "gradient-guru") {
        setGradientSessionPicks(pickGradientGuruSession());
      }
      setGameIndex(nextIndex);
      setAttemptIndex(0);
      return;
    }

    setPhase("results");
    useGameStore.getState().addMarathonScore(marathonScoreRef.current);
  }, [gameIndex, attemptIndex]);

  const handlePlayAgain = useCallback(() => {
    if (MARATHON_DEV.startAtGame && !MARATHON_DEV.skipToResults) {
      setPhase("game");
      setGameIndex(devStartIndex);
      setAttemptIndex(0);
      setCompletedRounds(devStartIndex);
      setMarathonScore(MARATHON_DEV.mockScore);
      marathonScoreRef.current = MARATHON_DEV.mockScore;
      return;
    }

    setPhase("picking");
    setGameIndex(0);
    setAttemptIndex(0);
    setCompletedRounds(0);
    setMarathonScore(0);
    setGradientSessionPicks(pickGradientGuruSession());
    marathonScoreRef.current = 0;
    useGameStore.getState().resetMarathon();
  }, [devStartIndex]);

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
        src={avatarFaceSrc}
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

      {(phase === "game" || phase === "results") && (
        <GameShell
          resetKey={`${activeGame.resetKey}-${gameIndex}-${attemptIndex}`}
          gameName={activeGame.name}
          description={undefined}
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
            onIntroComplete,
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
              onIntroComplete={onIntroComplete}
              addRoundScore={addRoundScore}
              onGameComplete={handleGameComplete}
              round={round}
              timeLeft={timeLeft}
              {...(activeGame.resetKey === "optical-panic"
                ? { sequenceIndex: attemptIndex, attemptIndex }
                : {})}
              {...(activeGame.resetKey === "retina-check"
                ? { sequenceIndex: attemptIndex, attemptIndex }
                : {})}
              {...(activeGame.resetKey === "bezier-brain"
                ? { sequenceIndex: attemptIndex, attemptIndex }
                : {})}
              {...(activeGame.resetKey === "gradient-guru"
                ? {
                    sequenceIndex: attemptIndex,
                    attemptIndex,
                    sessionPicks: gradientSessionPicks,
                  }
                : {})}
              {...(activeGame.resetKey === "untitled-project"
                ? { endGame, attemptIndex }
                : {})}
            />
          )}
        </GameShell>
      )}

      {phase === "results" && (
        <MarathonResults
          score={marathonScore}
          onPlayAgain={handlePlayAgain}
          instant={MARATHON_DEV.instantResults}
          freezeScene={MARATHON_DEV.freezeScene}
        />
      )}
    </div>
  );
}
