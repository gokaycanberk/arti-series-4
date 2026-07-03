"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import gsap from "gsap";
import DoneKeycap from "@/components/DoneKeycap";
import { GameDescBox } from "@/components/GameDescBox";
import ScoreSideReveal, {
  GURU_STACK_STEP,
} from "@/components/games/ScoreSideReveal";
import {
  averageGradientMissPx,
  hasUserMovedGuesses,
  scoreFromGradientDistance,
} from "@/components/games/scoreUtils";
import {
  getGradientGuruRound,
  pickGradientGuruSession,
  type GradientGuruRound,
} from "@/lib/gradientGuruVariations";

/* ─── TYPES ─── */
interface GradientGuruProps {
  gameKey: string;
  isPlaying: boolean;
  shellReady: boolean;
  onAnswer: (correct: boolean) => void;
  onGameStart: () => void;
  addRoundScore: (points: number) => void;
  round: number;
  timeLeft: number;
  onGameComplete?: () => void;
  /** Maraton / test: 0…2 — sessionPicks içindeki sıra */
  sequenceIndex?: number;
  /** 7'den seçilen 3 benzersiz gradient index'i */
  sessionPicks?: readonly number[];
}

type Phase = "idle" | "intro" | "playing" | "revealing" | "collapsing" | "done";

interface Point {
  x: number;
  y: number;
}

/* ─── CONSTANTS ─── */
const INK = "#1A1A1A";
const STROKE_W = 1;
const DOT_SIZE = 35;
const DOT_R = DOT_SIZE / 2;
const BOX_W_RATIO = 0.55;
const BOX_H_RATIO = 0.6;
const BRACKET_LEN = 24;
const BRACKET_THICK = 1;
const DOT_DROP_START = -160;
const DOT_DROP_DURATION = 2.4;

/** Guru skor stack görsel merkez düzeltmesi (katmanlar alta doğru) */
const GURU_SCORE_STACK_LAYERS = 7;

const DESC_TITLE = "GRADIENT GURU";
const DESC_BODY = `Place the gradient points\nwhere you think they belong\nand trust your totally scientific\nunderstanding of gradients.`;

// Plus sign line lengths (equal, forming a symmetric +)
const PLUS_ARM = 18; // half-length of each arm

/* ─── HELPERS ─── */
const SERVER_BOX_SIZE = { w: 700, h: 420 };

let cachedBoxSize: { w: number; h: number } = SERVER_BOX_SIZE;

function readBoxSizeSnapshot() {
  if (typeof window === "undefined") return SERVER_BOX_SIZE;

  const w = Math.round(window.innerWidth * BOX_W_RATIO);
  const h = Math.round(window.innerHeight * BOX_H_RATIO);

  if (cachedBoxSize.w === w && cachedBoxSize.h === h) {
    return cachedBoxSize;
  }

  cachedBoxSize = { w, h };
  return cachedBoxSize;
}

function subscribeToResize(onStoreChange: () => void) {
  window.addEventListener("resize", onStoreChange);
  return () => window.removeEventListener("resize", onStoreChange);
}

function useBoxSize() {
  return useSyncExternalStore(
    subscribeToResize,
    readBoxSizeSnapshot,
    () => SERVER_BOX_SIZE,
  );
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function randomStartPos(): Point {
  return { x: 0.2 + Math.random() * 0.6, y: 0.2 + Math.random() * 0.6 };
}

function DragDot() {
  return (
    <svg
      width={DOT_SIZE}
      height={DOT_SIZE}
      viewBox="0 0 35 35"
      fill="none"
      aria-hidden
      style={{ display: "block", overflow: "visible" }}
    >
      <circle cx="17.5" cy="17.5" r="17" stroke="white" strokeWidth={1} />
      <circle cx="17.5" cy="17.5" r="15" stroke="black" strokeWidth={1} />
    </svg>
  );
}

/* ─── COMPONENT ─── */
export default function GradientGuru({
  gameKey,
  isPlaying,
  shellReady,
  onAnswer,
  onGameStart,
  addRoundScore,
  round,
  timeLeft,
  onGameComplete,
  sequenceIndex = 0,
  sessionPicks: sessionPicksProp,
}: GradientGuruProps) {
  const sessionPicks = useMemo(
    () => sessionPicksProp ?? pickGradientGuruSession(),
    [sessionPicksProp],
  );

  /* ── State ── */
  const [phase, setPhase] = useState<Phase>("idle");
  const boxSize = useBoxSize();
  const [guesses, setGuesses] = useState<Point[]>([
    { x: 0.35, y: 0.35 },
    { x: 0.65, y: 0.65 },
  ]);
  const [showReveal, setShowReveal] = useState(false);
  const [flyScore, setFlyScore] = useState<number | null>(null);
  const [scoreOrigin, setScoreOrigin] = useState<Point | null>(null);

  /* ── Refs ── */
  const containerRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const borderRef = useRef<HTMLDivElement>(null);
  const plusRef = useRef<SVGSVGElement>(null);
  const bracketTLRef = useRef<HTMLDivElement>(null);
  const bracketBRRef = useRef<HTMLDivElement>(null);
  const dot0Ref = useRef<HTMLDivElement>(null);
  const dot1Ref = useRef<HTMLDivElement>(null);
  const revealSvgRef = useRef<SVGSVGElement>(null);
  const dragIdx = useRef<number | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const pendingScore = useRef(0);
  const pendingOk = useRef(false);
  const guessesAtPlayStartRef = useRef<Point[] | null>(null);
  const onGameStartRef = useRef(onGameStart);
  useEffect(() => {
    onGameStartRef.current = onGameStart;
  });

  const currentRound: GradientGuruRound = useMemo(
    () => getGradientGuruRound(sessionPicks, sequenceIndex),
    [sessionPicks, sequenceIndex],
  );

  /* ── Init on shellReady / gameKey change ── */
  useEffect(() => {
    if (!shellReady) return;
    queueMicrotask(() => {
      guessesAtPlayStartRef.current = null;
      setGuesses([randomStartPos(), randomStartPos()]);
      setShowReveal(false);
      setFlyScore(null);
      setScoreOrigin(null);
      setPhase("intro");
    });
  }, [shellReady, gameKey, sequenceIndex]);

  useEffect(() => {
    if (phase !== "playing" || guessesAtPlayStartRef.current !== null) return;
    guessesAtPlayStartRef.current = guesses.map((g) => ({ ...g }));
  }, [phase, guesses]);

  /* ── INTRO ANIMATION ── */
  useEffect(() => {
    if (phase !== "intro") return;

    const firstRound = sequenceIndex === 0;
    const image = imageRef.current;
    const border = borderRef.current;
    const plus = plusRef.current;
    const tlEl = bracketTLRef.current;
    const brEl = bracketBRRef.current;
    const desc = descRef.current;
    const d0 = dot0Ref.current;
    const d1 = dot1Ref.current;

    if (!image || !border || !plus || !tlEl || !brEl) return;

    // Initial states
    gsap.set(image, {
      scaleX: 0,
      scaleY: 0,
      transformOrigin: "center center",
    });
    gsap.set(border, {
      scaleX: 0,
      scaleY: 0,
      transformOrigin: "center center",
    });
    gsap.set(plus, { opacity: 1 });

    // Brackets start centered (they form the + together with plusRef)
    gsap.set(tlEl, {
      top: `calc(50% - ${BRACKET_LEN}px)`,
      left: `calc(50% - ${BRACKET_LEN}px)`,
      opacity: 0,
    });
    gsap.set(brEl, {
      top: "50%",
      left: "50%",
      opacity: 0,
    });

    // Açıklama kutusu yalnızca ilk turda soldan girer; sonraki turlarda görünür kalır
    if (desc) {
      if (firstRound) gsap.set(desc, { opacity: 0, x: -20 });
      else gsap.set(desc, { opacity: 1, x: 0 });
    }
    if (d0) gsap.set(d0, { opacity: 0, y: DOT_DROP_START });
    if (d1) gsap.set(d1, { opacity: 0, y: DOT_DROP_START });

    const tl = gsap.timeline({
      onComplete: () => {
        queueMicrotask(() => {
          setPhase("playing");
          onGameStartRef.current();
        });
      },
    });

    // 0–0.5s: Show "+" symbol centered
    tl.to({}, { duration: 0.5 });

    // Fade out plus, fade in brackets
    tl.to(plus, { opacity: 0, duration: 0.3 }, 0.5);
    tl.set(tlEl, { opacity: 1 }, 0.6);
    tl.set(brEl, { opacity: 1 }, 0.6);

    // Description fade in (yalnızca ilk tur)
    if (desc && firstRound) {
      tl.to(desc, { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }, 0.4);
    }

    // Brackets move to exact corners (flush with gradient edges)
    tl.to(
      tlEl,
      {
        top: -BRACKET_LEN,
        left: -BRACKET_LEN,
        duration: 0.8,
        ease: "power3.out",
      },
      0.6,
    );
    tl.to(
      brEl,
      {
        top: boxSize.h,
        left: boxSize.w,
        duration: 0.8,
        ease: "power3.out",
      },
      0.6,
    );

    // Image + border scale up (gradient revealed from center)
    tl.to(
      image,
      { scaleX: 1, scaleY: 1, duration: 0.8, ease: "power3.out" },
      0.6,
    );
    tl.to(
      border,
      { scaleX: 1, scaleY: 1, duration: 0.8, ease: "power3.out" },
      0.6,
    );

    // Dots drop slowly from above
    if (d0) {
      tl.to(
        d0,
        { opacity: 1, y: 0, duration: DOT_DROP_DURATION, ease: "power1.out" },
        1.4,
      );
    }
    if (d1) {
      tl.to(
        d1,
        { opacity: 1, y: 0, duration: DOT_DROP_DURATION, ease: "power1.out" },
        1.85,
      );
    }

    tlRef.current = tl;
    return () => {
      tl.kill();
    };
  }, [phase, boxSize, sequenceIndex]);

  /* ── COLLAPSE ── */
  const collapse = useCallback(() => {
    const image = imageRef.current;
    const border = borderRef.current;
    const plus = plusRef.current;
    const tlEl = bracketTLRef.current;
    const brEl = bracketBRRef.current;
    const d0 = dot0Ref.current;
    const d1 = dot1Ref.current;
    const revealSvg = revealSvgRef.current;

    if (!image || !border || !plus || !tlEl || !brEl) {
      setPhase("done");
      onAnswer(pendingOk.current);
      onGameComplete?.();
      return;
    }

    setPhase("collapsing");

    const tl = gsap.timeline({
      onComplete: () => {
        queueMicrotask(() => {
          setPhase("done");
          onAnswer(pendingOk.current);
          onGameComplete?.();
        });
      },
    });

    // Fade out dots and reveal SVG
    if (d0) tl.to(d0, { opacity: 0, duration: 0.4 }, 0);
    if (d1) tl.to(d1, { opacity: 0, duration: 0.4 }, 0);
    if (revealSvg) tl.to(revealSvg, { opacity: 0, duration: 0.4 }, 0);

    // Shrink image & border (yavaşlatıldı ~1sn)
    tl.to(
      image,
      { scaleX: 0, scaleY: 0, duration: 1.0, ease: "power2.inOut" },
      0.35,
    );
    tl.to(
      border,
      { scaleX: 0, scaleY: 0, duration: 1.0, ease: "power2.inOut" },
      0.35,
    );

    // Brackets return to center
    tl.to(
      tlEl,
      {
        top: `calc(50% - ${BRACKET_LEN}px)`,
        left: `calc(50% - ${BRACKET_LEN}px)`,
        duration: 1.0,
        ease: "power2.inOut",
      },
      0.35,
    );
    tl.to(
      brEl,
      {
        top: "50%",
        left: "50%",
        duration: 1.0,
        ease: "power2.inOut",
      },
      0.35,
    );

    // Fade out brackets, fade in plus
    tl.to(tlEl, { opacity: 0, duration: 0.25 }, 1.25);
    tl.to(brEl, { opacity: 0, duration: 0.25 }, 1.25);
    tl.to(plus, { opacity: 1, duration: 0.35 }, 1.3);
  }, [onAnswer, onGameComplete]);

  /* ── DONE handler ── */
  const handleDone = useCallback(() => {
    if (phase !== "playing") return;

    const startGuesses = guessesAtPlayStartRef.current;
    const played =
      startGuesses !== null &&
      hasUserMovedGuesses(
        startGuesses,
        guesses,
        boxSize.w,
        boxSize.h,
      );

    const totalPts = played
      ? scoreFromGradientDistance(
          averageGradientMissPx(
            guesses,
            [currentRound.start, currentRound.end],
            boxSize.w,
            boxSize.h,
          ),
          boxSize.w,
          boxSize.h,
        )
      : 0;
    pendingScore.current = totalPts;
    pendingOk.current = totalPts >= 500;

    setPhase("revealing");
    setShowReveal(true);

    // After showing reveal, trigger score fly from gradient center
    gsap.delayedCall(1.5, () => {
      const stage = stageRef.current;
      if (stage) {
        const r = stage.getBoundingClientRect();
        // Figma: ön katman üstte, 7 katman alta — görsel merkez gradient ortasında
        const stackDepth = GURU_SCORE_STACK_LAYERS * GURU_STACK_STEP;
        setScoreOrigin({
          x: r.left + r.width / 2,
          y: r.top + r.height / 2 - stackDepth * 0.5 - 72,
        });
      }
      setFlyScore(totalPts);
    });
  }, [guesses, phase, currentRound, boxSize]);

  /* ── Time's up ── */
  useEffect(() => {
    if (phase !== "playing" || !isPlaying || timeLeft > 0) return;
    queueMicrotask(() => handleDone());
  }, [phase, isPlaying, timeLeft, handleDone]);

  /* ── DRAG HANDLERS ── */
  const pointerToNorm = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const stage = stageRef.current;
      if (!stage) return null;
      const r = stage.getBoundingClientRect();
      return {
        x: clamp((clientX - r.left) / r.width, DOT_R / r.width, 1 - DOT_R / r.width),
        y: clamp((clientY - r.top) / r.height, DOT_R / r.height, 1 - DOT_R / r.height),
      };
    },
    [],
  );

  const onPointerDown = useCallback(
    (i: number, e: React.PointerEvent) => {
      if (phase !== "playing") return;
      e.preventDefault();
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      dragIdx.current = i;
    },
    [phase],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragIdx.current === null) return;
      const p = pointerToNorm(e.clientX, e.clientY);
      if (!p) return;
      setGuesses((prev) => prev.map((g, j) => (j === dragIdx.current ? p : g)));
    },
    [pointerToNorm],
  );

  const onPointerUp = useCallback(() => {
    dragIdx.current = null;
  }, []);

  /* ── Computed pixel positions ── */
  const correctPx = useMemo(
    () => [
      {
        x: currentRound.start.x * boxSize.w,
        y: currentRound.start.y * boxSize.h,
      },
      {
        x: currentRound.end.x * boxSize.w,
        y: currentRound.end.y * boxSize.h,
      },
    ],
    [currentRound, boxSize],
  );

  const showDots =
    phase === "playing" || phase === "revealing" || phase === "intro";
  const showDone = phase === "playing";

  /* ─── RENDER ─── */
  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden select-none"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ── Description Box ── */}
      <GameDescBox ref={descRef} title={DESC_TITLE}>
        {DESC_BODY}
      </GameDescBox>

      {/* ── Main Game Stage ── */}
      <div className="absolute inset-0 flex min-h-0 flex-col">
        <div className="min-h-0 flex-1" />
        <div className="relative flex shrink-0 items-center justify-center">
        {/* Plus sign (visible at start and end) */}
        <svg
          ref={plusRef}
          className="absolute pointer-events-none z-10"
          width={PLUS_ARM * 2 + 2}
          height={PLUS_ARM * 2 + 2}
          style={{ opacity: 1 }}
        >
          {/* Horizontal line */}
          <line
            x1={0}
            y1={PLUS_ARM + 1}
            x2={PLUS_ARM * 2 + 2}
            y2={PLUS_ARM + 1}
            stroke={INK}
            strokeWidth={BRACKET_THICK}
          />
          {/* Vertical line */}
          <line
            x1={PLUS_ARM + 1}
            y1={0}
            x2={PLUS_ARM + 1}
            y2={PLUS_ARM * 2 + 2}
            stroke={INK}
            strokeWidth={BRACKET_THICK}
          />
        </svg>

        <div
          ref={stageRef}
          className="relative"
          style={{ width: boxSize.w, height: boxSize.h }}
        >
          {/* Border (thin line around gradient) */}
          <div
            ref={borderRef}
            className="absolute pointer-events-none"
            style={{
              inset: 0,
              border: `${STROKE_W}px solid ${INK}`,
              transform: "scaleX(0) scaleY(0)",
              transformOrigin: "center center",
            }}
          />

          {/* Gradient image (from public folder) */}
          <div
            ref={imageRef}
            className="absolute"
            style={{
              inset: 0,
              backgroundImage: `url(${currentRound.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              transform: "scaleX(0) scaleY(0)",
              transformOrigin: "center center",
            }}
          />

          {/* Top-left bracket ┘ (sits outside top-left corner) */}
          <div
            ref={bracketTLRef}
            className="absolute pointer-events-none"
            style={{
              width: BRACKET_LEN,
              height: BRACKET_LEN,
              top: `calc(50% - ${BRACKET_LEN}px)`,
              left: `calc(50% - ${BRACKET_LEN}px)`,
              opacity: 0,
            }}
          >
            {/* Bottom line */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: "100%",
                height: BRACKET_THICK,
                backgroundColor: INK,
              }}
            />
            {/* Right line */}
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: BRACKET_THICK,
                height: "100%",
                backgroundColor: INK,
              }}
            />
          </div>

          {/* Bottom-right bracket ┌ (sits outside bottom-right corner) */}
          <div
            ref={bracketBRRef}
            className="absolute pointer-events-none"
            style={{
              width: BRACKET_LEN,
              height: BRACKET_LEN,
              top: "50%",
              left: "50%",
              opacity: 0,
            }}
          >
            {/* Top line */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: BRACKET_THICK,
                backgroundColor: INK,
              }}
            />
            {/* Left line */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: BRACKET_THICK,
                height: "100%",
                backgroundColor: INK,
              }}
            />
          </div>

          {/* ── Draggable Dots (Figma double-ring) ── */}
          {showDots &&
            guesses.map((g, i) => (
              <div
                key={i}
                ref={i === 0 ? dot0Ref : dot1Ref}
                className="absolute z-10"
                style={{
                  left: `${g.x * 100}%`,
                  top: `${g.y * 100}%`,
                  width: DOT_SIZE,
                  height: DOT_SIZE,
                  transform: "translate(-50%, -50%)",
                  cursor: phase === "playing" ? "grab" : "default",
                  touchAction: "none",
                  pointerEvents: phase === "playing" ? "auto" : "none",
                  opacity: 0,
                }}
                onPointerDown={(e) => onPointerDown(i, e)}
              >
                <DragDot />
              </div>
            ))}

          {/* ── Reveal: correct positions (gold/white circles) ── */}
          {showReveal && (
            <svg
              ref={revealSvgRef}
              className="absolute inset-0 w-full h-full pointer-events-none z-20"
              style={{ overflow: "visible" }}
            >
              {correctPx.map((c, i) => (
                <circle
                  key={`correct-${i}`}
                  cx={c.x}
                  cy={c.y}
                  r={17}
                  fill="#F1C871"
                  stroke="white"
                  strokeWidth={1}
                />
              ))}
            </svg>
          )}
        </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center">
          {showDone && <DoneKeycap onPress={handleDone} />}
        </div>
      </div>

      {/* ── Score Fly Animation ── */}
      {flyScore !== null && scoreOrigin && (
        <ScoreSideReveal
          key={`${gameKey}-${round}-${flyScore}`}
          points={flyScore}
          anchorRef={stageRef}
          origin={scoreOrigin}
          variant="gradient-guru"
          onScoreLand={() => addRoundScore(pendingScore.current)}
          onComplete={() => {
            queueMicrotask(() => {
              setFlyScore(null);
              setScoreOrigin(null);
              collapse();
            });
          }}
        />
      )}
    </div>
  );
}
