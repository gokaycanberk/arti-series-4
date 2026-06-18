"use client";

import { useCallback, useState } from "react";
import ColorPicker from "@/components/ColorPicker";
import { GameShell } from "@/components/GameShell";
import type { GameShellChildState } from "@/components/GameShell";
import OpticalPanic from "@/components/games/OpticalPanic";
import RetinaCheck from "@/components/games/RetinaCheck";

type Phase = "picking" | "transitioning" | "game";

const MARATHON_GAMES = [
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
] as const;

export default function OnboardingPage() {
  const [phase, setPhase] = useState<Phase>("picking");
  const [gameIndex, setGameIndex] = useState(0);
  const [marathonScore, setMarathonScore] = useState(0);

  const activeGame = MARATHON_GAMES[gameIndex] ?? MARATHON_GAMES[0]!;
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

  const handleGameComplete = () => {
    if (gameIndex < MARATHON_GAMES.length - 1) {
      setGameIndex((prev) => prev + 1);
    }
  };

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
          key="marathon"
          resetKey={`${activeGame.resetKey}-${gameIndex + 1}`}
          gameName={activeGame.name}
          duration={activeGame.duration}
          initialRound={gameIndex + 1}
          initialScore={marathonScore}
          onScoreAdd={handleScoreAdd}
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
            <ActiveComponent
              key={activeGame.resetKey}
              gameKey={activeGame.resetKey}
              isPlaying={isPlaying}
              shellReady={shellReady}
              onAnswer={onAnswer}
              onGameStart={startGame}
              addRoundScore={addRoundScore}
              onGameComplete={handleGameComplete}
              round={round}
              timeLeft={timeLeft}
            />
          )}
        </GameShell>
      )}
    </div>
  );
}
