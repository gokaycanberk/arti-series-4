"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import gsap from "gsap";
import DoneKeycap from "@/components/DoneKeycap";
import { GameDescBox } from "@/components/GameDescBox";
import { GameIntroOverlay } from "@/components/GameIntroOverlay";
import { introPendingPhase, shouldSkipIntroCard } from "@/lib/gameIntro";
import { useGameIntroPlay } from "@/lib/useGameIntroPlay";
import ScoreSideReveal from "@/components/games/ScoreSideReveal";
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
  onIntroComplete: () => void;
  addRoundScore: (points: number) => void;
  round: number;
  timeLeft: number;
  onGameComplete?: () => void;
  /** Maraton / test: 0…2 — sessionPicks içindeki sıra */
  sequenceIndex?: number;
  attemptIndex?: number;
  /** 7'den seçilen 3 benzersiz gradient index'i */
  sessionPicks?: readonly number[];
}

type Phase = "idle" | "intro" | "setup" | "playing" | "revealing" | "collapsing" | "done";

interface Point {
  x: number;
  y: number;
}

/* ─── CONSTANTS ─── */
const INK = "#1A1A1A";
const DOT_SIZE = 35;
const DOT_R = DOT_SIZE / 2;
const BOX_W_RATIO = 0.55;
const BOX_H_RATIO = 0.6;
const BRACKET_LEN = 24;
const BRACKET_THICK = 1;
/** Bracket outer offset so inner arms sit on the gradient border stroke */
const BRACKET_REST_OFFSET = BRACKET_LEN - BRACKET_THICK;

function bracketOpenTL() {
  return { left: -BRACKET_REST_OFFSET, top: -BRACKET_REST_OFFSET };
}

function bracketOpenBR(boxW: number, boxH: number) {
  // BR çizgileri -BRACKET_THICK offset ile çiziliyor; kutu köşede +1px dışarıda
  return { left: boxW, top: boxH };
}

/** Kapalı + — piksel hizalı merkez */
function closedBracketPositions(boxW: number, boxH: number) {
  const cx = Math.round(boxW / 2);
  const cy = Math.round(boxH / 2);
  return {
    tlLeft: cx - BRACKET_LEN,
    tlTop: cy - BRACKET_LEN,
    brLeft: cx,
    brTop: cy,
  };
}
const DOT_DROP_START = -160;
const DOT_DROP_DURATION = 2.4;
/** Done tuşu — bırakma animasyonu + fade */
const DONE_RELEASE_HOLD = 0.22;
const DONE_EXIT_DURATION = 0.28;

const DESC_BODY =
  "Place the gradient points where you think they belong and trust your totally scientific understanding of gradients.";

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
  onIntroComplete,
  addRoundScore,
  round,
  timeLeft,
  onGameComplete,
  sequenceIndex = 0,
  attemptIndex,
  sessionPicks: sessionPicksProp,
}: GradientGuruProps) {
  const sessionPicks = useMemo(
    () => sessionPicksProp ?? pickGradientGuruSession(),
    [sessionPicksProp],
  );

  /* ── State ── */
  const [phase, setPhase] = useState<Phase>("intro");
  const boxSize = useBoxSize();
  const [guesses, setGuesses] = useState<Point[]>([
    { x: 0.35, y: 0.35 },
    { x: 0.65, y: 0.65 },
  ]);
  const [showReveal, setShowReveal] = useState(false);
  const [flyScore, setFlyScore] = useState<number | null>(null);
  const [doneExiting, setDoneExiting] = useState(false);

  /* ── Refs ── */
  const containerRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const borderRef = useRef<HTMLDivElement>(null);
  const bracketTLRef = useRef<HTMLDivElement>(null);
  const bracketBRRef = useRef<HTMLDivElement>(null);
  const dot0Ref = useRef<HTMLDivElement>(null);
  const dot1Ref = useRef<HTMLDivElement>(null);
  const doneWrapRef = useRef<HTMLDivElement>(null);
  const doneExitTweenRef = useRef<gsap.core.Tween | null>(null);
  const revealSvgRef = useRef<SVGSVGElement>(null);
  const dragIdx = useRef<number | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const pendingScore = useRef(0);
  const pendingOk = useRef(false);
  const roundFinishedRef = useRef(false);
  const guessesAtPlayStartRef = useRef<Point[] | null>(null);
  const onGameStartRef = useRef(onGameStart);
  const onIntroCompleteRef = useRef(onIntroComplete);
  useEffect(() => {
    onGameStartRef.current = onGameStart;
  });
  useEffect(() => {
    onIntroCompleteRef.current = onIntroComplete;
  });

  const handleIntroDismiss = useCallback(() => {
    onIntroCompleteRef.current();
    setPhase("setup");
  }, []);

  const {
    cardRef: introCardRef,
    playEnabled: introPlayEnabled,
    playPressed: introPlayPressed,
    handlePlay: handleIntroPlay,
  } = useGameIntroPlay({
    active: phase === "intro",
    onDismiss: handleIntroDismiss,
  });

  const currentRound: GradientGuruRound = useMemo(
    () => getGradientGuruRound(sessionPicks, sequenceIndex),
    [sessionPicks, sequenceIndex],
  );

  const closedBrackets = useMemo(
    () => closedBracketPositions(boxSize.w, boxSize.h),
    [boxSize],
  );

  /* ── Init on shellReady / gameKey change ── */
  useEffect(() => {
    if (!shellReady) return;
    queueMicrotask(() => {
      roundFinishedRef.current = false;
      guessesAtPlayStartRef.current = null;
      setGuesses([randomStartPos(), randomStartPos()]);
      setShowReveal(false);
      setFlyScore(null);
      doneExitTweenRef.current?.kill();
      setDoneExiting(false);
      if (doneWrapRef.current) {
        gsap.set(doneWrapRef.current, { opacity: 1, y: 0 });
      }
      const introAttempt = attemptIndex ?? sequenceIndex;
      if (shouldSkipIntroCard(introAttempt)) {
        onIntroCompleteRef.current();
        setPhase("setup");
      } else {
        setPhase("intro");
      }
    });
  }, [shellReady, gameKey, sequenceIndex, attemptIndex]);

  useEffect(() => {
    if (phase !== "playing" || guessesAtPlayStartRef.current !== null) return;
    guessesAtPlayStartRef.current = guesses.map((g) => ({ ...g }));
  }, [phase, guesses]);

  /* ── SETUP — ilk karede gizle (flash önleme) ── */
  useLayoutEffect(() => {
    if (phase !== "setup") return;

    const firstRound = sequenceIndex === 0;
    const image = imageRef.current;
    const border = borderRef.current;
    const tlEl = bracketTLRef.current;
    const brEl = bracketBRRef.current;
    const desc = descRef.current;
    const d0 = dot0Ref.current;
    const d1 = dot1Ref.current;

    if (image) {
      gsap.set(image, { scaleX: 0, scaleY: 0, transformOrigin: "center center" });
    }
    if (border) {
      gsap.set(border, { scaleX: 0, scaleY: 0, transformOrigin: "center center" });
    }
    if (tlEl) {
      gsap.set(tlEl, {
        top: closedBrackets.tlTop,
        left: closedBrackets.tlLeft,
        opacity: 1,
      });
    }
    if (brEl) {
      gsap.set(brEl, {
        top: closedBrackets.brTop,
        left: closedBrackets.brLeft,
        opacity: 1,
      });
    }
    if (desc) {
      if (firstRound) gsap.set(desc, { opacity: 0, x: -20 });
      else gsap.set(desc, { opacity: 1, x: 0 });
    }
    if (d0) gsap.set(d0, { opacity: 0, y: DOT_DROP_START });
    if (d1) gsap.set(d1, { opacity: 0, y: DOT_DROP_START });
  }, [phase, sequenceIndex, gameKey, closedBrackets]);

  /* ── SETUP ANIMATION (bracket + gradient) ── */
  useEffect(() => {
    if (phase !== "setup") return;

    const firstRound = sequenceIndex === 0;
    const image = imageRef.current;
    const border = borderRef.current;
    const tlEl = bracketTLRef.current;
    const brEl = bracketBRRef.current;
    const desc = descRef.current;
    const d0 = dot0Ref.current;
    const d1 = dot1Ref.current;

    if (!image || !border || !tlEl || !brEl) return;

    if (sequenceIndex > 0) {
      onIntroCompleteRef.current();
    }

    const tl = gsap.timeline({
      onComplete: () => {
        queueMicrotask(() => {
          setPhase("playing");
          onGameStartRef.current();
        });
      },
    });

    tl.to({}, { duration: 0.5 });

    if (desc && firstRound) {
      tl.to(desc, { opacity: 1, x: 0, duration: 1.05, ease: "power3.out" }, 0.35);
    }

    const openTL = bracketOpenTL();
    const openBR = bracketOpenBR(boxSize.w, boxSize.h);

    tl.to(
      tlEl,
      {
        top: openTL.top,
        left: openTL.left,
        duration: 0.8,
        ease: "power3.out",
      },
      0.6,
    );
    tl.to(
      brEl,
      {
        top: openBR.top,
        left: openBR.left,
        duration: 0.8,
        ease: "power3.out",
      },
      0.6,
    );
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
  }, [phase, boxSize, sequenceIndex, gameKey]);

  /* ── COLLAPSE ── */
  const collapse = useCallback(() => {
    const image = imageRef.current;
    const border = borderRef.current;
    const tlEl = bracketTLRef.current;
    const brEl = bracketBRRef.current;
    const d0 = dot0Ref.current;
    const d1 = dot1Ref.current;
    const revealSvg = revealSvgRef.current;

    if (!image || !border || !tlEl || !brEl) {
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
        top: closedBrackets.tlTop,
        left: closedBrackets.tlLeft,
        duration: 1.0,
        ease: "power2.inOut",
      },
      0.35,
    );
    tl.to(
      brEl,
      {
        top: closedBrackets.brTop,
        left: closedBrackets.brLeft,
        duration: 1.0,
        ease: "power2.inOut",
      },
      0.35,
    );
  }, [closedBrackets, onAnswer, onGameComplete]);

  /* ── DONE / time's up ── */
  const finishRound = useCallback(
    (opts?: { forceZero?: boolean }) => {
      if (phase !== "playing" || roundFinishedRef.current) return;
      roundFinishedRef.current = true;

      let totalPts = 0;
      if (!opts?.forceZero) {
        const startGuesses = guessesAtPlayStartRef.current;
        const played =
          startGuesses !== null &&
          hasUserMovedGuesses(
            startGuesses,
            guesses,
            boxSize.w,
            boxSize.h,
          );

        totalPts = played
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
      }

      pendingScore.current = totalPts;
      pendingOk.current = totalPts >= 500;

      setPhase("revealing");
      setShowReveal(true);

      gsap.delayedCall(1.5, () => {
        setFlyScore(totalPts);
      });
    },
    [guesses, phase, currentRound, boxSize],
  );

  const dismissDoneButton = useCallback((onComplete: () => void) => {
    const wrap = doneWrapRef.current;
    if (!wrap) {
      onComplete();
      return;
    }

    doneExitTweenRef.current?.kill();
    gsap.set(wrap, { opacity: 1, y: 0 });
    doneExitTweenRef.current = gsap.to(wrap, {
      opacity: 0,
      y: 10,
      duration: DONE_EXIT_DURATION,
      ease: "power2.in",
      onComplete,
    });
  }, []);

  const handleDone = useCallback(() => {
    if (doneExiting || phase !== "playing" || roundFinishedRef.current) return;

    setDoneExiting(true);
    gsap.delayedCall(DONE_RELEASE_HOLD, () => {
      dismissDoneButton(finishRound);
    });
  }, [doneExiting, dismissDoneButton, finishRound, phase]);

  useEffect(() => {
    if (phase !== "playing" || !isPlaying || timeLeft > 0) return;
    finishRound({ forceZero: true });
  }, [phase, isPlaying, timeLeft, finishRound]);

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
    phase === "setup" || phase === "playing" || phase === "revealing";
  const showDone = phase === "playing" || doneExiting;

  const gameUiVisible =
    !introPendingPhase(phase) &&
    (phase === "setup" ||
      phase === "playing" ||
      phase === "revealing" ||
      phase === "collapsing" ||
      phase === "done");

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
      <GameIntroOverlay
        ref={introCardRef}
        gameId="gradient-guru"
        description={DESC_BODY}
        playEnabled={introPlayEnabled}
        playPressed={introPlayPressed}
        onPlay={handleIntroPlay}
      />

      {gameUiVisible ? (
        <GameDescBox
          ref={descRef}
          gameId="gradient-guru"
          style={{ opacity: phase === "setup" ? 0 : 1 }}
        >
          {DESC_BODY}
        </GameDescBox>
      ) : null}

      {gameUiVisible ? (
        <>
      {/* ── Main Game Stage ── */}
      <div className="absolute inset-0 flex min-h-0 flex-col">
        <div className="min-h-0 flex-1" />
        <div className="relative flex shrink-0 items-center justify-center">
        <div
          ref={stageRef}
          className="relative"
          style={{ width: boxSize.w, height: boxSize.h }}
        >
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

          {/* Border — bracket çizgileriyle aynı stroke */}
          <div
            ref={borderRef}
            className="absolute pointer-events-none z-1"
            style={{
              inset: 0,
              border: `${BRACKET_THICK}px solid ${INK}`,
              transform: "scaleX(0) scaleY(0)",
              transformOrigin: "center center",
            }}
          />

          {/* Top-left bracket — merkezde + oluşturur, açılınca sol üst köşe */}
          <div
            ref={bracketTLRef}
            className="absolute pointer-events-none z-10"
            style={{
              width: BRACKET_LEN,
              height: BRACKET_LEN,
              top: closedBrackets.tlTop,
              left: closedBrackets.tlLeft,
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

          {/* Bottom-right bracket — merkezde + oluşturur, açılınca sağ alt köşe */}
          <div
            ref={bracketBRRef}
            className="absolute pointer-events-none z-10"
            style={{
              width: BRACKET_LEN,
              height: BRACKET_LEN,
              top: closedBrackets.brTop,
              left: closedBrackets.brLeft,
            }}
          >
            {/* Top line — merkez satırı paylaşır */}
            <div
              style={{
                position: "absolute",
                top: -BRACKET_THICK,
                left: 0,
                width: "100%",
                height: BRACKET_THICK,
                backgroundColor: INK,
              }}
            />
            {/* Left line — merkez sütunu paylaşır */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: -BRACKET_THICK,
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
          {showDone && (
            <div ref={doneWrapRef}>
              <DoneKeycap onPress={handleDone} disabled={doneExiting} />
            </div>
          )}
        </div>
      </div>

      {/* ── Score Fly Animation ── */}
      {flyScore !== null && (
        <ScoreSideReveal
          key={`${gameKey}-${round}-${flyScore}`}
          points={flyScore}
          flyTargetLift={100}
          onScoreLand={() => addRoundScore(pendingScore.current)}
          onComplete={() => {
            queueMicrotask(() => {
              setFlyScore(null);
              collapse();
            });
          }}
        />
      )}
        </>
      ) : null}
    </div>
  );
}
