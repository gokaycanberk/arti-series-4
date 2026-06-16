"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";

/* ─── Constants ─── */
const FALL_DURATION = 18;
const STEP_SIZE = 2;

const WORDS = [
  { word: "LOREM", missingIndex: 1 },
  { word: "BRAND", missingIndex: 2 },
  { word: "THEME", missingIndex: 3 },
  { word: "CROWN", missingIndex: 2 },
];

/* ─── Types ─── */
interface OpticalPanicProps {
  isPlaying: boolean;
  shellReady: boolean;
  onAnswer: (correct: boolean) => void;
  onGameStart: () => void;
  round: number;
}

type Phase = "waiting" | "intro" | "playing" | "landed";

/* ─── Component ─── */
export default function OpticalPanic({
  isPlaying,
  shellReady,
  onAnswer,
  onGameStart,
  round,
}: OpticalPanicProps) {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [currentWord, setCurrentWord] = useState(WORDS[0]!);
  const [fallingX, setFallingX] = useState(0);
  const [landed, setLanded] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fallingRef = useRef<HTMLDivElement>(null);
  const correctCharRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const leftBtnRef = useRef<HTMLButtonElement>(null);
  const rightBtnRef = useRef<HTMLButtonElement>(null);
  const introCardRef = useRef<HTMLDivElement>(null);
  const descBoxRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const handleLandRef = useRef<() => void>(() => {});

  /* ─── handleLand ─── */
  useEffect(() => {
    handleLandRef.current = () => {
      if (landed) return;
      setLanded(true);
      setPhase("landed");

      const distance = Math.abs(fallingX);
      let points = 0;
      if (distance <= 2) points = 100;
      else if (distance <= 5) points = 90;
      else if (distance <= 10) points = 75;
      else if (distance <= 20) points = 50;
      else if (distance <= 40) points = 25;
      setScore(points);

      // Red correct char fade in
      setTimeout(() => {
        if (correctCharRef.current) {
          gsap.to(correctCharRef.current, {
            opacity: 1,
            duration: 0.8,
            ease: "power2.out",
          });
        }
      }, 400);

      // Note band expand from top-left
      setTimeout(() => {
        if (noteRef.current) {
          gsap.fromTo(
            noteRef.current,
            { scaleX: 0, scaleY: 0, opacity: 0 },
            {
              scaleX: 1,
              scaleY: 1,
              opacity: 1,
              duration: 0.6,
              ease: "back.out(1.2)",
            },
          );
        }
      }, 1200);

      setTimeout(() => onAnswer(points >= 50), 3500);
    };
  }, [landed, fallingX, onAnswer]);

  /* ─── Shell ready → intro ─── */
  useEffect(() => {
    if (!shellReady || phase !== "waiting") return;
    queueMicrotask(() => setPhase("intro"));
  }, [shellReady, phase]);

  /* ─── Intro animation ─── */
  useEffect(() => {
    if (phase !== "intro") return;
    const card = introCardRef.current;
    const descBox = descBoxRef.current;
    const controls = controlsRef.current;
    if (!card) return;

    const tl = gsap.timeline();
    tl.fromTo(
      card,
      { y: "100vh", opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "back.out(1.2)" },
    )
      .to({}, { duration: 2 })
      .to(card, { y: "100vh", opacity: 0, duration: 0.6, ease: "power2.in" });

    if (descBox) {
      tl.fromTo(
        descBox,
        { x: -80, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, ease: "power3.out" },
        "-=0.2",
      );
    }
    if (controls) {
      tl.fromTo(
        controls,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" },
        "-=0.2",
      );
    }

    tl.call(() => {
      queueMicrotask(() => {
        const wordObj = WORDS[Math.floor(Math.random() * WORDS.length)]!;
        setCurrentWord(wordObj);
        const offset =
          (Math.random() > 0.5 ? 1 : -1) *
          (60 + Math.floor(Math.random() * 90));
        setFallingX(offset);
        setLanded(false);
        setScore(null);
        setPhase("playing");
        onGameStart();
      });
    });

    return () => {
      tl.kill();
    };
  }, [phase, onGameStart]);

  /* ─── Falling animation (Y-axis only, stays in baseline) ─── */
  useEffect(() => {
    if (phase !== "playing" || !isPlaying || landed) return;
    const el = fallingRef.current;
    if (!el) return;

    // KEY FIX: animate translateY only. At y:0 the letter is at baseline.
    gsap.set(el, { y: -800 });
    const tween = gsap.to(el, {
      y: 0,
      duration: FALL_DURATION,
      ease: "none",
      onComplete: () => handleLandRef.current(),
    });

    return () => {
      tween.kill();
    };
  }, [phase, isPlaying, landed, round]);

  /* ─── Move controls ─── */
  const moveLeft = useCallback(() => {
    if (landed || phase !== "playing") return;
    setFallingX((p) => p - STEP_SIZE);
    if (leftBtnRef.current) {
      gsap.to(leftBtnRef.current, {
        backgroundColor: "#1A1A1A",
        color: "#fff",
        scale: 0.92,
        duration: 0.06,
        yoyo: true,
        repeat: 1,
      });
    }
  }, [landed, phase]);

  const moveRight = useCallback(() => {
    if (landed || phase !== "playing") return;
    setFallingX((p) => p + STEP_SIZE);
    if (rightBtnRef.current) {
      gsap.to(rightBtnRef.current, {
        backgroundColor: "#1A1A1A",
        color: "#fff",
        scale: 0.92,
        duration: 0.06,
        yoyo: true,
        repeat: 1,
      });
    }
  }, [landed, phase]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        moveLeft();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        moveRight();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [moveLeft, moveRight]);

  /* ─── Derived ─── */
  const wordChars = currentWord.word.split("");

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none"
    >
      {/* ═══ INTRO CARD ═══ */}
      <div
        ref={introCardRef}
        className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
        style={{ opacity: 0 }}
      >
        <div
          className="bg-white/95 backdrop-blur-sm rounded-[40px] px-12 py-8 flex flex-col items-center text-center shadow-lg"
          style={{ maxWidth: "460px" }}
        >
          <h2
            style={{
              fontSize: "clamp(28px, 5vw, 42px)",
              fontFamily: "var(--font-planc), serif",
              fontWeight: 700,
              color: "#1A1A1A",
              marginBottom: "12px",
            }}
          >
            OPTICAL PANIC
          </h2>
          <p className="text-[14px] text-[#555] leading-relaxed">
            Use the arrow keys to guide the falling letter into the right spot.
          </p>
        </div>
      </div>

      {/* ═══ LEFT PANEL ═══ */}
      <div
        className="absolute top-0 left-0 z-20 flex flex-col"
        style={{ padding: "20px 24px", gap: "12px" }}
      >
        {/* Description box */}
        <div
          ref={descBoxRef}
          style={{
            opacity: 0,
            border: "1.5px solid #1A1A1A",
            backgroundColor: "#FFFFFF",
            padding: "14px 16px",
            width: "190px",
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-planc), serif",
              fontWeight: 700,
              fontSize: "13px",
              color: "#1A1A1A",
              marginBottom: "6px",
            }}
          >
            Curve Control
          </h3>
          <p
            style={{
              fontFamily: "var(--font-planc), serif",
              fontWeight: 450,
              fontSize: "10px",
              lineHeight: "14px",
              color: "#1A1A1A",
            }}
          >
            Move each anchor point to its correct position on the path then
            press done and let&apos;s see how type nerd you really are.
          </p>
        </div>

        {/* Arrow controls: ↑ top row, ← ↓ → bottom row */}
        <div ref={controlsRef} style={{ opacity: 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "-1px",
            }}
          >
            <button
              disabled
              style={{
                width: "36px",
                height: "36px",
                border: "1.5px solid #1A1A1A",
                backgroundColor: "#fff",
                color: "#999",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ↑
            </button>
          </div>
          <div style={{ display: "flex" }}>
            <button
              ref={leftBtnRef}
              onClick={moveLeft}
              style={{
                width: "36px",
                height: "36px",
                border: "1.5px solid #1A1A1A",
                backgroundColor: "#fff",
                color: "#1A1A1A",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ←
            </button>
            <button
              disabled
              style={{
                width: "36px",
                height: "36px",
                borderTop: "1.5px solid #1A1A1A",
                borderBottom: "1.5px solid #1A1A1A",
                borderLeft: "none",
                borderRight: "none",
                backgroundColor: "#fff",
                color: "#999",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ↓
            </button>
            <button
              ref={rightBtnRef}
              onClick={moveRight}
              style={{
                width: "36px",
                height: "36px",
                border: "1.5px solid #1A1A1A",
                backgroundColor: "#fff",
                color: "#1A1A1A",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              →
            </button>
          </div>
        </div>

        {/* Note band (expands from top-left after landing) */}
        <div
          ref={noteRef}
          style={{
            opacity: 0,
            transform: "scaleX(0) scaleY(0)",
            transformOrigin: "top left",
            backgroundColor: "#1A1A1A",
            padding: "10px 14px",
            width: "190px",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-planc), serif",
              fontWeight: 450,
              fontSize: "12px",
              lineHeight: "16px",
              color: "#FFFFFF",
            }}
          >
            Yes, we think that&apos;s the right kerning. Got a problem with it?
            Cry here → info@artistudyo.com
          </p>
        </div>
      </div>

      {/* ═══ WORD AREA (fixed at bottom) ═══ */}
      {(phase === "playing" || phase === "landed") && (
        <div
          className="absolute left-0 right-0"
          style={{ bottom: "10%", padding: "0 5%" }}
        >
          {/* Word container - all letters share same baseline */}
          <div className="relative flex justify-center items-baseline">
            {/* Static word (missing char = transparent) */}
            {wordChars.map((c, i) => (
              <span
                key={`s${i}`}
                style={{
                  fontSize: "clamp(80px, 14vw, 200px)",
                  fontFamily: "var(--font-planc), serif",
                  fontWeight: 600,
                  color:
                    i === currentWord.missingIndex ? "transparent" : "#1A1A1A",
                  letterSpacing: "0.01em",
                }}
              >
                {c}
              </span>
            ))}

            {/* FALLING LETTER - same position as word, only translateX + translateY offset */}
            <div
              ref={fallingRef}
              className="absolute inset-0 flex justify-center items-baseline pointer-events-none"
              style={{ transform: `translateX(${fallingX}px) translateY(0px)` }}
            >
              {wordChars.map((c, i) => (
                <span
                  key={`f${i}`}
                  style={{
                    fontSize: "clamp(80px, 14vw, 200px)",
                    fontFamily: "var(--font-planc), serif",
                    fontWeight: 600,
                    color:
                      i === currentWord.missingIndex
                        ? "#1A1A1A"
                        : "transparent",
                    letterSpacing: "0.01em",
                  }}
                >
                  {c}
                </span>
              ))}
            </div>

            {/* RED CORRECT LETTER - NO translateX, always at correct position */}
            <div
              ref={correctCharRef}
              className="absolute inset-0 flex justify-center items-baseline pointer-events-none"
              style={{ opacity: 0 }}
            >
              {wordChars.map((c, i) => (
                <span
                  key={`r${i}`}
                  style={{
                    fontSize: "clamp(80px, 14vw, 200px)",
                    fontFamily: "var(--font-planc), serif",
                    fontWeight: 600,
                    color:
                      i === currentWord.missingIndex
                        ? "#CC2222"
                        : "transparent",
                    letterSpacing: "0.01em",
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Baseline */}
          <div
            style={{
              height: "1.5px",
              backgroundColor: "#1A1A1A",
              width: "100%",
              marginTop: "2px",
            }}
          />
        </div>
      )}

      {/* Score feedback */}
      {phase === "landed" && score !== null && (
        <div
          className="absolute top-4 right-4 z-20 px-4 py-2"
          style={{
            backgroundColor:
              score >= 90 ? "#4CAF50" : score >= 50 ? "#FF9800" : "#FF5252",
            color: "#fff",
            fontFamily: "var(--font-planc), serif",
            fontWeight: 700,
            fontSize: "14px",
          }}
        >
          +{score}
        </div>
      )}
    </div>
  );
}
