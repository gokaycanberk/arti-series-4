"use client";

import { useState } from "react";
import ColorPicker from "@/components/ColorPicker";
import { GameShell } from "@/components/GameShell";
import type { GameShellChildState } from "@/components/GameShell";
import OpticalPanic from "@/components/games/OpticalPanic";

type Phase = "picking" | "transitioning" | "game";

export default function OnboardingPage() {
  const [phase, setPhase] = useState<Phase>("picking");

  const handleTransitionStart = () => {
    setPhase("transitioning");
  };

  const handleTransitionComplete = () => {
    setPhase("game");
  };

  return (
    <div className="fixed inset-0 h-screen w-screen overflow-hidden bg-[#E8E8E8]">
      {/* Flash overlay */}
      <div
        id="flash-overlay"
        className="fixed inset-0 z-[9999] pointer-events-none"
        style={{ backgroundColor: "white", opacity: 0 }}
      />

      {/* Face reveal */}
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
          resetKey="optical-panic"
          gameName="OPTICAL PANIC"
          duration={30}
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
              isPlaying={isPlaying}
              shellReady={shellReady}
              onAnswer={onAnswer}
              onGameStart={startGame}
              addRoundScore={addRoundScore}
              round={round}
              timeLeft={timeLeft}
            />
          )}
        </GameShell>
      )}
    </div>
  );
}
