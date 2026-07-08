"use client";

import gsap from "gsap";
import { useEffect, useLayoutEffect, useState, useCallback, useRef } from "react";
import { GameDescBox } from "@/components/GameDescBox";
import { MarathonProgressBar } from "@/components/MarathonProgressBar";
import {
  SHELL_BAR_INSET_X,
  SHELL_CHROME_Z,
  SHELL_GAME_Z,
  SHELL_HEADER_HEIGHT,
  SHELL_LOGO_HEIGHT,
  SHELL_LOGO_TOP,
  SHELL_LOGO_WIDTH,
  SHELL_PANEL_INSET_X,
  SHELL_PANEL_TOP,
  SHELL_PROGRESS_WRAP_TOP,
  SHELL_SCORE_PANEL_GAP,
  SHELL_SCORE_PANEL_ROW_HEIGHT,
  SHELL_SCORE_FONT_SIZE,
  SHELL_SCORE_PANEL_WIDTH,
  SHELL_STROKE,
} from "@/lib/gameShellLayout";
import { MARATHON_TOTAL_STEPS } from "@/lib/marathon";
import { MARATHON_SCORE_DIGIT_COUNT } from "@/lib/scoreRing";
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
  /** Intro kartı indikten sonra sol paneli göster */
  onIntroComplete: () => void;
};

interface GameShellProps {
  resetKey?: string;
  gameId?: string;
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
  gameId,
  gameName,
  description,
  duration = 30,
  marathonStep = 0,
  initialRound = 1,
  initialScore = 0,
  onScoreAdd,
  children,
}: GameShellProps) {
  const nickname = useGameStore((state) => state.nickname);
  const hexChipBg =
    nickname && /^#?[0-9A-F]{6}$/i.test(nickname)
      ? nickname.startsWith("#")
        ? nickname
        : `#${nickname}`
      : "#F7BEA0";
  const [score, setScore] = useState(initialScore);
  const [round, setRound] = useState(initialRound);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shellReady, setShellReady] = useState(false);
  const [introActive, setIntroActive] = useState(true);
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

  // Yeni oyun — skor maratondan gelir; shell girişi yalnızca ilk seferde oynar.
  // useLayoutEffect: reset, child'ın onGameStart (passive) efektinden ÖNCE
  // çalışsın; aksi halde isPlaying yeniden false'a çekilip timer başlamıyor.
  useLayoutEffect(() => {
    setScore(initialScoreRef.current);
    setRound(initialRound);
    setTimeLeft(duration);
    setIsPlaying(false);
    setIntroActive(true);
    if (shellEnteredRef.current) {
      setShellReady(true);
    }
  }, [resetKey, duration, initialRound]);

  const onIntroComplete = useCallback(() => {
    setIntroActive(false);
    if (!description) return;
    const leftPanel = document.getElementById("gs-left-panel");
    if (!leftPanel) return;
    gsap.fromTo(
      leftPanel,
      { opacity: 0, x: -36 },
      { opacity: 1, x: 0, duration: 1.05, ease: "power3.out" },
    );
  }, [description]);

  const onAnswer = useCallback(() => {
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

  const registerLiveScoreGetter = useCallback((getter: () => number) => {
    setLiveScoreGetter((prev) => (prev === getter ? prev : getter));
  }, []);

  // İlk giriş — avatar bar hizasında soldan gelir
  useLayoutEffect(() => {
    if (shellEnteredRef.current) return;
    const avatar = document.getElementById("gs-progress-avatar");
    if (!avatar) return;
    gsap.set(avatar, { x: -(window.innerWidth * 0.12 + 80), opacity: 1 });
  }, []);

  // Entrance animations
  useEffect(() => {
    const avatar = document.getElementById("gs-progress-avatar");
    const isFirstEntry = !shellEnteredRef.current;

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
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: "power2.out" },
        0.2,
      )
      .fromTo(
        "#gs-right-panel",
        { x: 80, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.7, ease: "power3.out" },
        0.35,
      );

    if (avatar && isFirstEntry) {
      tl.to(
        avatar,
        {
          x: 0,
          duration: 0.75,
          ease: "power3.out",
        },
        0.22,
      );
    }

    tl.fromTo(
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
  const scoreDigits = MARATHON_SCORE_DIGIT_COUNT;
  const rowHeight = SHELL_SCORE_PANEL_ROW_HEIGHT;
  const scoreFontSize = SHELL_SCORE_FONT_SIZE;

  return (
    <div className="absolute inset-0 flex flex-col bg-[#E8E8E8]">
      {/* HEADER — Figma: menu @68px, logo, progress @128px */}
      <div
        id="gs-header"
        className="relative z-60 shrink-0"
        style={{ height: SHELL_HEADER_HEIGHT, opacity: 0 }}
      >
        <div
          id="gs-site-logo"
          className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center"
          style={{
            top: SHELL_LOGO_TOP,
            width: SHELL_LOGO_WIDTH,
            height: SHELL_LOGO_HEIGHT,
            zIndex: 60,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- animated brand logo */}
          <img
            src="/layers/goodeyelogo.gif"
            alt="Good Eye Club"
            className="pointer-events-none h-full w-full select-none object-contain"
          />
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
        {description && !introActive ? (
          <div
            id="gs-left-panel"
            className="pointer-events-none absolute inset-0"
            style={{ zIndex: SHELL_CHROME_Z, opacity: 0 }}
          >
            <GameDescBox
              gameId={gameId ?? resetKey ?? ""}
              className="pointer-events-auto"
              style={{ opacity: 1 }}
            >
              {description}
            </GameDescBox>
          </div>
        ) : null}

        {/* Sağ skor paneli — bar altında, Figma hizası */}
        <div
          id="gs-right-panel"
          className="absolute flex flex-col items-end"
          style={{
            opacity: 0,
            zIndex: SHELL_CHROME_Z,
            top: SHELL_PANEL_TOP,
            right: SHELL_PANEL_INSET_X,
            gap: SHELL_SCORE_PANEL_GAP,
          }}
        >
          <div
            id="gs-hex-chip"
            className="flex items-center justify-center"
            style={{
              backgroundColor: hexChipBg,
              width: `${panelWidth}px`,
              height: `${rowHeight}px`,
              border: SHELL_STROKE,
              boxSizing: "border-box",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-planc), serif",
                fontWeight: 700,
                fontSize: `${scoreFontSize}px`,
                color: "#1A1A1A",
              }}
            >
              HEX&nbsp;
            </span>
            <span
              style={{
                fontFamily: "var(--font-planc), serif",
                fontWeight: 450,
                fontSize: `${scoreFontSize}px`,
                color: "#1A1A1A",
              }}
            >
              {nickname?.toUpperCase() || "#F7BEA0"}
            </span>
          </div>

          <div
            id="gs-score-digits"
            style={{
              width: `${panelWidth}px`,
              height: `${rowHeight}px`,
              border: SHELL_STROKE,
              boxSizing: "border-box",
              display: "grid",
              gridTemplateColumns: `repeat(${scoreDigits}, 1fr)`,
            }}
          >
            {String(score)
              .slice(-scoreDigits)
              .padStart(scoreDigits, "0")
              .split("")
              .map((digit, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center"
                  style={{
                    height: "100%",
                    borderRight: i < scoreDigits - 1 ? SHELL_STROKE : undefined,
                    backgroundColor: "#E5E5E5",
                    color: "#1A1A1A",
                    fontFamily: "var(--font-planc), serif",
                    fontSize: `${scoreFontSize}px`,
                    fontWeight: 500,
                    boxSizing: "border-box",
                  }}
                >
                  {digit}
                </div>
              ))}
          </div>

          <div
            className="flex items-center justify-center"
            style={{
              width: `${panelWidth}px`,
              height: `${rowHeight}px`,
              backgroundColor: "#FFFFFF",
              fontFamily: "var(--font-planc), serif",
              fontSize: `${scoreFontSize}px`,
              fontWeight: 500,
              color: "#1A1A1A",
              border: SHELL_STROKE,
              boxSizing: "border-box",
            }}
          >
            {formatTime(timeLeft)}
          </div>
        </div>

        {children ? (
          <div className="absolute inset-0" style={{ zIndex: SHELL_GAME_Z }}>
            {children({
              score,
              round,
              totalRounds: MARATHON_TOTAL_STEPS,
              timeLeft,
              isPlaying,
              shellReady,
              onAnswer,
              addRoundScore,
              setLiveScoreGetter: registerLiveScoreGetter,
              endGame,
              startGame,
              onIntroComplete,
            })}
          </div>
        ) : (
          <p className="font-planc text-[16px] text-[#999]">{gameName || ""}</p>
        )}
      </div>

      {/* Footer */}
      <div
        id="gs-site-footer"
        className="absolute bottom-4 flex flex-col items-end gap-0.5"
        style={{
          right: SHELL_PANEL_INSET_X,
          zIndex: 60,
          opacity: introActive ? 0 : 1,
          transition: "opacity 0.4s ease",
        }}
      >
        <span className="text-[9px] text-[#999]">created by</span>
        <a
          href="https://studyo.co"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="+Stüdyo"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="+Stüdyo" width={53} height={13} />
        </a>
      </div>
    </div>
  );
}

export default GameShell;
