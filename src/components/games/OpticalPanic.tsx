"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";

interface OpticalPanicProps {
  isPlaying: boolean;
  shellReady: boolean;
  onAnswer: (correct: boolean) => void;
  onGameStart: () => void;
  round: number;
}

const WORDS = [
  { word: "LOREM", missingIndex: 1 },
  { word: "BRAND", missingIndex: 2 },
  { word: "THEME", missingIndex: 3 },
  { word: "CROWN", missingIndex: 2 },
];

type Phase = "waiting" | "intro" | "playing" | "landed";

export default function OpticalPanic({
  isPlaying,
  shellReady,
  onAnswer,
  onGameStart,
  round,
}: OpticalPanicProps) {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [currentWord, setCurrentWord] = useState(WORDS[0]!);
  const [landed, setLanded] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fallingRef = useRef<HTMLDivElement>(null);
  const correctCharRef = useRef<HTMLDivElement>(null);
  const fallingXRef = useRef(0);
  const animRef = useRef<gsap.core.Tween | null>(null);
  const introCardRef = useRef<HTMLDivElement>(null);
  const descBoxRef = useRef<HTMLDivElement>(null);
  const wordAreaRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const leftBtnRef = useRef<HTMLButtonElement>(null);
  const rightBtnRef = useRef<HTMLButtonElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const handleLandRef = useRef<() => void>(() => {});
  const hasStartedRef = useRef(false);

  const FALL_DURATION = 18;
  const STEP_SIZE = 2;
  const SPAWN_OFFSET_FROM_TOP = 8;

  const getFallStartY = useCallback(() => {
    const container = containerRef.current;
    const wordArea = wordAreaRef.current;
    if (!container || !wordArea) return -1200;

    const containerRect = container.getBoundingClientRect();
    const wordRect = wordArea.getBoundingClientRect();
    const baselineFromTop = wordRect.bottom - containerRect.top;

    return -(baselineFromTop - SPAWN_OFFSET_FROM_TOP);
  }, []);

  const prepareRound = useCallback(() => {
    const wordObj = WORDS[Math.floor(Math.random() * WORDS.length)]!;
    setCurrentWord(wordObj);
    fallingXRef.current =
      (Math.random() > 0.5 ? 1 : -1) * (60 + Math.floor(Math.random() * 90));
    if (correctCharRef.current) {
      gsap.set(correctCharRef.current, { opacity: 0 });
    }
    if (noteRef.current) {
      gsap.set(noteRef.current, { opacity: 0, scaleX: 0, scaleY: 0 });
    }
    if (fallingRef.current) {
      gsap.set(fallingRef.current, {
        y: getFallStartY(),
        x: fallingXRef.current,
      });
    }
    setLanded(false);
    setScore(null);
  }, [getFallStartY]);

  // --- handleLand ref ---
  useEffect(() => {
    handleLandRef.current = () => {
      if (landed) return;
      setLanded(true);
      setPhase("landed");

      const currentX = gsap.getProperty(fallingRef.current, "x") as number;
      const distance = Math.abs(typeof currentX === "number" ? currentX : 0);
      let points = 0;

      if (distance <= 2) {
        points = 100;
      } else if (distance <= 5) {
        points = 90;
      } else if (distance <= 10) {
        points = 75;
      } else if (distance <= 20) {
        points = 50;
      } else if (distance <= 40) {
        points = 25;
      } else {
        points = 0;
      }

      setScore(points);

      // Kırmızı doğru pozisyon harfi göster
      setTimeout(() => {
        if (correctCharRef.current) {
          gsap.to(correctCharRef.current, {
            opacity: 1,
            duration: 0.6,
            ease: "power2.out",
          });
        }
      }, 300);

      // Not bandı aç
      setTimeout(() => {
        if (noteRef.current) {
          gsap.to(noteRef.current, {
            scaleX: 1,
            scaleY: 1,
            opacity: 1,
            duration: 0.5,
            ease: "back.out(1.4)",
          });
        }
      }, 1000);

      setTimeout(() => {
        onAnswer(points >= 50);
      }, 3500);
    };
  }, [landed, onAnswer]);

  // --- Popup bitince harf düşmeye başlar ---
  useEffect(() => {
    if (!shellReady || hasStartedRef.current) return;
    hasStartedRef.current = true;

    prepareRound();
    setPhase("intro");

    const card = introCardRef.current;
    const descBox = descBoxRef.current;
    const controls = controlsRef.current;

    const tl = gsap.timeline({
      onComplete: () => {
        setPhase("playing");
        onGameStart();
      },
    });

    if (descBox) {
      tl.fromTo(
        descBox,
        { opacity: 0, y: -8 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" },
        0,
      );
    }

    if (controls) {
      tl.fromTo(
        controls,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" },
        0.1,
      );
    }

    if (card) {
      tl.fromTo(
        card,
        { y: "100vh", opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "back.out(1.2)" },
        0.15,
      );
      tl.to({}, { duration: 1.5 });
      tl.to(card, {
        y: "100vh",
        opacity: 0,
        duration: 0.6,
        ease: "power2.in",
      });
    }

    return () => {
      tl.kill();
    };
  }, [shellReady, onGameStart, prepareRound]);

  // --- Harf düşme animasyonu (popup bittikten sonra) ---
  useEffect(() => {
    if (phase !== "playing" || !isPlaying || landed) return;

    const el = fallingRef.current;
    if (!el) return;

    let frameId = 0;

    const startFall = () => {
      const startY = getFallStartY();
      gsap.set(el, { y: startY, x: fallingXRef.current });

      animRef.current = gsap.to(el, {
        y: 0,
        duration: FALL_DURATION,
        ease: "none",
        onComplete: () => {
          handleLandRef.current();
        },
      });
    };

    frameId = requestAnimationFrame(() => {
      frameId = requestAnimationFrame(startFall);
    });

    return () => {
      cancelAnimationFrame(frameId);
      animRef.current?.kill();
    };
  }, [phase, isPlaying, landed, round, getFallStartY]);

  // --- Sol/Sağ hareket ---
  const moveLeft = useCallback(() => {
    if (landed || phase !== "playing" || !fallingRef.current) return;
    fallingXRef.current -= STEP_SIZE;
    gsap.set(fallingRef.current, { x: fallingXRef.current });

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
    if (landed || phase !== "playing" || !fallingRef.current) return;
    fallingXRef.current += STEP_SIZE;
    gsap.set(fallingRef.current, { x: fallingXRef.current });

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

  // --- Klavye ---
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        moveLeft();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        moveRight();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [moveLeft, moveRight]);

  // --- Render ---
  const wordChars = currentWord.word.split("");
  const charStyle = {
    fontSize: "clamp(120px, 22vw, 340px)",
    fontFamily: "var(--font-planc), serif",
    fontWeight: 600,
    letterSpacing: "0",
  } as const;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col items-center justify-end overflow-hidden select-none"
    >
      {/* INTRO CARD */}
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
            className="font-bold text-[#1A1A1A] mb-3"
            style={{
              fontSize: "clamp(28px, 5vw, 42px)",
              fontFamily: "var(--font-planc), serif",
            }}
          >
            OPTICAL PANIC
          </h2>
          <p className="text-[14px] text-[#555] leading-relaxed">
            Use the arrow keys to guide the falling letter into the right spot
            and pray your optical kerning survives the chaos.
          </p>
        </div>
      </div>

      {/* SOL PANEL — avatar altı kutu + ok tuşları */}
      <div
        className="absolute top-0 left-0 z-20 flex flex-col"
        style={{ padding: "8px 24px", gap: "12px" }}
      >
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
            OPTICAL PANIC
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
            Use the arrow keys to guide the falling letter into the right spot
            then press done and let&apos;s see how type nerd you really are.
          </p>
        </div>

        <div ref={controlsRef} style={{ opacity: 0 }}>
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
              aria-label="Move left"
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
              aria-label="Move down"
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
              aria-label="Move right"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* KELİME — sabit + düşen harf aynı wrapper içinde */}
      {(phase === "intro" || phase === "playing" || phase === "landed") && (
        <div
          ref={wordAreaRef}
          className="absolute bottom-[4%] left-0 right-0 flex justify-center"
        >
          <div className="relative flex justify-center items-baseline">
            {wordChars.map((char, i) => (
              <span
                key={`static-${i}`}
                className="leading-none"
                style={{
                  ...charStyle,
                  color:
                    i === currentWord.missingIndex ? "transparent" : "#1A1A1A",
                }}
              >
                {char}
              </span>
            ))}

            <div
              ref={correctCharRef}
              className="absolute inset-0 flex justify-center items-baseline pointer-events-none"
              style={{ opacity: 0 }}
            >
              {wordChars.map((char, i) => (
                <span
                  key={`correct-${i}`}
                  className="leading-none"
                  style={{
                    ...charStyle,
                    color:
                      i === currentWord.missingIndex
                        ? "#CC2222"
                        : "transparent",
                  }}
                >
                  {char}
                </span>
              ))}
            </div>

            <div
              ref={fallingRef}
              className="absolute inset-0 flex justify-center items-baseline pointer-events-none"
              style={{
                visibility:
                  phase === "playing" || phase === "landed"
                    ? "visible"
                    : "hidden",
              }}
            >
              {wordChars.map((char, i) => (
                <span
                  key={`falling-${i}`}
                  className="leading-none"
                  style={{
                    ...charStyle,
                    color:
                      i === currentWord.missingIndex
                        ? "#1A1A1A"
                        : "transparent",
                  }}
                >
                  {char}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* NOT BANDI — + şeklinden açılır */}
      <div
        ref={noteRef}
        className="absolute z-30 pointer-events-auto"
        style={{
          bottom: "18%",
          left: "24px",
          opacity: 0,
          transform: "scaleX(0) scaleY(0)",
          transformOrigin: "center center",
          backgroundColor: "#1A1A1A",
          padding: "10px 16px",
          maxWidth: "260px",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-planc), serif",
            fontWeight: 450,
            fontSize: "12px",
            lineHeight: "16px",
            color: "#FFFFFF",
            letterSpacing: "0%",
          }}
        >
          Yes, we think that&apos;s the right kerning. Got a problem with it?
          Cry here → info@artistudyo.com
        </p>
      </div>

      {/* ALT ÇİZGİ */}
      <div
        className="absolute bottom-[3%] left-[3%] right-[3%]"
        style={{ height: "1.5px", backgroundColor: "#1A1A1A" }}
      />

      {/* OK KONTROLLERİ — sol panelde (desc box altında) */}
    </div>
  );
}
