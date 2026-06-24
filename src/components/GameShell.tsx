"use client";

import gsap from "gsap";
import { useEffect, useState, useCallback, useRef } from "react";
import { MarathonProgressBar } from "@/components/MarathonProgressBar";
import {
  SHELL_BAR_INSET_X,
  SHELL_HEADER_HEIGHT,
  SHELL_LOGO_HEIGHT,
  SHELL_LOGO_TOP,
  SHELL_LOGO_WIDTH,
  SHELL_MENU_BAR_GAP,
  SHELL_MENU_BAR_HEIGHT,
  SHELL_MENU_TOP,
  SHELL_MENU_WIDTH,
  SHELL_PANEL_INSET_X,
  SHELL_PANEL_TOP,
  SHELL_PROGRESS_WRAP_TOP,
  SHELL_SCORE_PANEL_GAP,
  SHELL_SCORE_PANEL_WIDTH,
} from "@/lib/gameShellLayout";
import { MARATHON_TOTAL_STEPS } from "@/lib/marathon";
import { useGameStore } from "@/stores/gameStore";

export type GameShellChildState = {
  score: number;
  round: number;
  totalRounds: number;
  timeLeft: number;
  isPlaying: boolean;
  shellReady: boolean;
  onAnswer: (correct: boolean) => void;
  addRoundScore: (points: number) => void;
  setLiveScoreGetter: (getter: () => number) => void;
  endGame: () => void;
  startGame: () => void;
};

interface GameShellProps {
  resetKey?: string;
  gameName?: string;
  description?: string;
  duration?: number;
  /** Maraton ilerleme adımı (0 … MARATHON_TOTAL_STEPS) */
  marathonStep?: number;
  /** @deprecated Maraton için marathonStep kullanın */
  initialRound?: number;
  /** Önceki oyunlardan biriken toplam skor */
  initialScore?: number;
  onScoreAdd?: (points: number) => void;
  children?: (state: GameShellChildState) => React.ReactElement;
}

export function GameShell({
  resetKey,
  gameName,
  duration = 30,
  marathonStep = 0,
  initialRound = 1,
  initialScore = 0,
  onScoreAdd,
  children,
}: GameShellProps) {
  const nickname = useGameStore((state) => state.nickname);
  const [score, setScore] = useState(initialScore);
  const [round, setRound] = useState(initialRound);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shellReady, setShellReady] = useState(false);
  const [, setLiveScoreGetter] = useState<(() => number) | null>(null);
  const shellEnteredRef = useRef(false);
  const initialScoreRef = useRef(initialScore);
  useEffect(() => {
    initialScoreRef.current = initialScore;
  });

  // Timer
  useEffect(() => {
    if (!isPlaying || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, isPlaying]);

  // Yeni oyun — skor maratondan gelir; shell girişi yalnızca ilk seferde oynar
  useEffect(() => {
    setScore(initialScoreRef.current);
    setRound(initialRound);
    setTimeLeft(duration);
    setIsPlaying(false);
    if (shellEnteredRef.current) {
      setShellReady(true);
    }
  }, [resetKey, duration, initialRound]);

  const onAnswer = useCallback((correct: boolean) => {
    setRound((prev) => prev + 1);
  }, []);

  const addRoundScore = useCallback(
    (points: number) => {
      setScore((prev) => prev + points);
      onScoreAdd?.(points);
    },
    [onScoreAdd],
  );

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
        shellEnteredRef.current = true;
        setShellReady(true);
      },
    });
    tl.fromTo(
      "#gs-header",
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

  const panelWidth = SHELL_SCORE_PANEL_WIDTH;
  const scoreDigits = 7;
  const cellWidth = Math.floor(panelWidth / scoreDigits);

  return (
    <div className="absolute inset-0 flex flex-col bg-[#E8E8E8]">
      {/* HEADER — Figma: menu @68px, logo, progress @128px */}
      <div
        id="gs-header"
        className="relative flex-shrink-0"
        style={{ height: SHELL_HEADER_HEIGHT, opacity: 0 }}
      >
        <button
          type="button"
          className="absolute cursor-pointer border-0 bg-transparent p-0"
          style={{
            top: SHELL_MENU_TOP,
            left: SHELL_PANEL_INSET_X,
          }}
          aria-label="Menu"
        >
          <span
            className="block"
            style={{
              width: SHELL_MENU_WIDTH,
              height: SHELL_MENU_BAR_HEIGHT,
              backgroundColor: "#1A1A1A",
            }}
          />
          <span
            className="block"
            style={{
              width: SHELL_MENU_WIDTH,
              height: SHELL_MENU_BAR_HEIGHT,
              marginTop: SHELL_MENU_BAR_GAP,
              backgroundColor: "#1A1A1A",
            }}
          />
        </button>

        <div
          className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center"
          style={{
            top: SHELL_LOGO_TOP,
            width: SHELL_LOGO_WIDTH,
            height: SHELL_LOGO_HEIGHT,
            backgroundColor: "#C4C4C4",
          }}
        >
          <span
            className="text-center text-white"
            style={{
              fontFamily: "var(--font-planc), serif",
              fontSize: 27,
              lineHeight: "normal",
            }}
          >
            LOGO GELECEK
          </span>
        </div>

        <div
          id="gs-progress-row"
          className="absolute left-0 right-0"
          style={{
            top: SHELL_PROGRESS_WRAP_TOP,
            paddingLeft: SHELL_BAR_INSET_X,
            paddingRight: SHELL_BAR_INSET_X,
          }}
        >
          <MarathonProgressBar step={marathonStep} />
        </div>
      </div>

      {/* GAME AREA */}
      <div
        id="gs-game-area"
        className="relative min-h-0 flex-1"
        style={{ opacity: 0 }}
      >
        {/* Sağ skor paneli — bar altında, Figma hizası */}
        <div
          id="gs-right-panel"
          className="absolute z-10 flex flex-col items-end"
          style={{
            opacity: 0,
            top: SHELL_PANEL_TOP,
            right: SHELL_PANEL_INSET_X,
            gap: SHELL_SCORE_PANEL_GAP,
          }}
        >
          <div
            className="flex items-center justify-center border border-[#1A1A1A]"
            style={{
              backgroundColor: "#F7BEA0",
              width: `${panelWidth}px`,
              height: "34px",
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

          <div id="gs-score-digits" className="flex" style={{ width: `${panelWidth}px` }}>
            {String(score)
              .padStart(scoreDigits, "0")
              .split("")
              .map((digit, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center border border-[#1A1A1A]"
                  style={{
                    width: `${cellWidth}px`,
                    height: "34px",
                    marginLeft: i > 0 ? -1 : 0,
                    backgroundColor: "#E5E5E5",
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
              height: "34px",
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
              totalRounds: MARATHON_TOTAL_STEPS,
              timeLeft,
              isPlaying,
              shellReady,
              onAnswer,
              addRoundScore,
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
      <div className="absolute bottom-4 flex flex-col items-end" style={{ right: SHELL_PANEL_INSET_X }}>
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
