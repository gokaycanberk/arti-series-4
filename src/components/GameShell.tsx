"use client";

import gsap from "gsap";
import { useEffect, useState, useCallback } from "react";
import { useGameStore } from "@/stores/gameStore";

export type GameShellChildState = {
  score: number;
  round: number;
  totalRounds: number;
  timeLeft: number;
  isPlaying: boolean;
  shellReady: boolean;
  onAnswer: (correct: boolean) => void;
  setLiveScoreGetter: (getter: () => number) => void;
  endGame: () => void;
  startGame: () => void;
};

interface GameShellProps {
  resetKey?: string;
  gameName?: string;
  description?: string;
  duration?: number;
  children?: (state: GameShellChildState) => React.ReactElement;
}

export function GameShell({
  resetKey,
  gameName,
  duration = 30,
  children,
}: GameShellProps) {
  const nickname = useGameStore((state) => state.nickname);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shellReady, setShellReady] = useState(false);
  const [, setLiveScoreGetter] = useState<(() => number) | null>(null);
  const totalRounds = 6;

  // Timer
  useEffect(() => {
    if (!isPlaying || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, isPlaying]);

  // Reset
  useEffect(() => {
    queueMicrotask(() => {
      setScore(0);
      setRound(1);
      setTimeLeft(duration);
      setIsPlaying(false);
      setShellReady(false);
    });
  }, [resetKey, duration]);

  const onAnswer = useCallback((correct: boolean) => {
    if (correct) {
      setScore((prev) => prev + 1);
    }
    setRound((prev) => prev + 1);
  }, []);

  const endGame = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const startGame = useCallback(() => {
    setIsPlaying(true);
  }, []);

  // Entrance animations
  useEffect(() => {
    const tl = gsap.timeline({
      defaults: { ease: "back.out(1.4)" },
      onComplete: () => {
        setShellReady(true);
      },
    });
    tl.fromTo(
      "#gs-navbar",
      { y: -50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6 },
      0,
    )
      .fromTo(
        "#gs-progress-row",
        { x: -60, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.7, ease: "power3.out" },
        0.2,
      )
      .fromTo(
        "#gs-right-panel",
        { x: 80, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.7, ease: "power3.out" },
        0.35,
      )
      .fromTo(
        "#gs-game-area",
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7 },
        0.6,
      );
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const panelWidth = 180;

  return (
    <div className="absolute inset-0 flex flex-col bg-[#E8E8E8]">
      {/* NAVBAR */}
      <div id="gs-navbar" style={{ opacity: 0 }}>
        <div className="flex items-center justify-between px-6 py-4">
          <button
            className="flex flex-col gap-[5px] cursor-pointer"
            aria-label="Menu"
          >
            <span
              className="block rounded-sm"
              style={{
                backgroundColor: "#1A1A1A",
                height: "4px",
                width: "32px",
              }}
            />
            <span
              className="block rounded-sm"
              style={{
                backgroundColor: "#1A1A1A",
                height: "4px",
                width: "32px",
              }}
            />
          </button>

          <div className="absolute left-1/2 -translate-x-1/2">
            <span
              className="text-[14px] text-[#fff] px-5 py-2 rounded"
              style={{
                backgroundColor: "rgba(0,0,0,0.35)",
                fontFamily: "var(--font-planc), serif",
              }}
            >
              LOGO GELECEK
            </span>
          </div>

          <div style={{ width: 32 }} />
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div
        id="gs-progress-row"
        className="flex items-center gap-3 px-6 mt-4 flex-shrink-0"
        style={{ opacity: 0 }}
      >
        <div className="flex-shrink-0">
          <img
            src="/Avatar_Set/face/face.png"
            alt="avatar"
            className="rounded-full border border-[#1A1A1A]"
            style={{ width: "32px", height: "32px" }}
          />
        </div>

        <div
          className="flex-1 min-w-0 relative"
          style={{
            height: "6px",
            backgroundColor: "#D4D4D4",
            borderRadius: "3px",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${((round - 1) / totalRounds) * 100}%`,
              backgroundColor: "#1A1A1A",
              borderRadius: "3px",
              transition: "width 0.5s ease",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-between pointer-events-none">
            {Array.from({ length: totalRounds + 1 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: "1.5px",
                  height: "16px",
                  backgroundColor: "#1A1A1A",
                  marginTop: "-5px",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* GAME AREA */}
      <div
        id="gs-game-area"
        className="relative flex-1 min-h-0 mt-2"
        style={{ opacity: 0 }}
      >
        {/* Sağ göstergeler — sol kutu ile simetrik, barın altında */}
        <div
          id="gs-right-panel"
          className="absolute top-0 right-6 z-10 flex flex-col items-end gap-[5px]"
          style={{ opacity: 0 }}
        >
          <div
            className="flex items-center justify-center border border-[#1A1A1A]"
            style={{
              backgroundColor: nickname || "#F7BEA0",
              width: `${panelWidth}px`,
              height: "32px",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-planc), serif",
                fontWeight: 700,
                fontSize: "13px",
                color: "#1A1A1A",
              }}
            >
              HEX&nbsp;
            </span>
            <span
              style={{
                fontFamily: "var(--font-planc), serif",
                fontWeight: 450,
                fontSize: "13px",
                color: "#1A1A1A",
              }}
            >
              {nickname?.toUpperCase() || "#F7BEA0"}
            </span>
          </div>

          <div className="flex" style={{ width: `${panelWidth}px` }}>
            {String(score)
              .padStart(6, "0")
              .split("")
              .map((digit, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center border border-[#1A1A1A]"
                  style={{
                    flex: 1,
                    height: "32px",
                    backgroundColor: "#FFFFFF",
                    color: "#1A1A1A",
                    fontFamily: "var(--font-planc), serif",
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  {digit}
                </div>
              ))}
          </div>

          <div
            className="flex items-center justify-center border border-[#1A1A1A]"
            style={{
              width: `${panelWidth}px`,
              height: "32px",
              backgroundColor: "#FFFFFF",
              fontFamily: "var(--font-planc), serif",
              fontSize: "13px",
              fontWeight: 500,
              color: "#1A1A1A",
            }}
          >
            {formatTime(timeLeft)}
          </div>
        </div>

        {children ? (
          <div className="absolute inset-0">
            {children({
              score,
              round,
              totalRounds,
              timeLeft,
              isPlaying,
              shellReady,
              onAnswer,
              setLiveScoreGetter: (getter: () => number) =>
                setLiveScoreGetter(() => getter),
              endGame,
              startGame,
            })}
          </div>
        ) : (
          <p className="font-planc text-[16px] text-[#999]">{gameName || ""}</p>
        )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 right-6 flex flex-col items-end">
        <span className="text-[9px] text-[#999]">created by</span>
        <span
          className="text-[11px] text-[#666]"
          style={{ fontFamily: "var(--font-planc), serif", fontWeight: 700 }}
        >
          #Sideyo
        </span>
      </div>
    </div>
  );
}

export default GameShell;
