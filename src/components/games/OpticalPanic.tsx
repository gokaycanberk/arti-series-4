"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import ArrowKeycap, { type ArrowKeycapHandle } from "@/components/ArrowKeycap";

interface OpticalPanicProps {
  isPlaying: boolean;
  shellReady: boolean;
  onAnswer: (correct: boolean) => void;
  onGameStart: () => void;
  round: number;
  timeLeft: number;
}

const WORDS = [
  { word: "LOREM", missingIndex: 1 },
  { word: "BRAND", missingIndex: 2 },
  { word: "THEME", missingIndex: 3 },
  { word: "CROWN", missingIndex: 2 },
];

type Phase = "waiting" | "intro" | "playing" | "landed";

const WORD_BOTTOM = "14%";
const SPAWN_OFFSET_FROM_TOP = 8;

export default function OpticalPanic({
  isPlaying,
  shellReady,
  onAnswer,
  onGameStart,
  round,
  timeLeft,
}: OpticalPanicProps) {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [currentWord, setCurrentWord] = useState(WORDS[0]!);
  const [landed, setLanded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const fallingRef = useRef<HTMLDivElement>(null);
  const correctCharRef = useRef<HTMLDivElement>(null);
  const fallingXRef = useRef(0);
  const animRef = useRef<gsap.core.Tween | null>(null);
  const introCardRef = useRef<HTMLDivElement>(null);
  const descBoxRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const leftKeyRef = useRef<ArrowKeycapHandle>(null);
  const rightKeyRef = useRef<ArrowKeycapHandle>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const wordAreaRef = useRef<HTMLDivElement>(null);
  const wordTextRef = useRef<HTMLDivElement>(null);
  const handleLandRef = useRef<() => void>(() => {});
  const landedRef = useRef(false);
  const hasStartedRef = useRef(false);

  const FALL_DURATION = 8;
  const STEP_SIZE = 2;
  const RED_REVEAL_DELAY = 2500;
  const NOTE_REVEAL_DELAY = 4000;

  const getFallStartY = useCallback(() => {
    const container = containerRef.current;
    const wordText = wordTextRef.current;
    if (!container || !wordText) return -1200;

    const containerRect = container.getBoundingClientRect();
    const wordRect = wordText.getBoundingClientRect();
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
        visibility: "hidden",
      });
    }
    setLanded(false);
    landedRef.current = false;
  }, [getFallStartY]);

  useEffect(() => {
    handleLandRef.current = () => {
      if (landedRef.current) return;
      landedRef.current = true;
      setLanded(true);
      setPhase("landed");

      animRef.current?.kill();
      if (fallingRef.current) {
        gsap.set(fallingRef.current, { y: 0, x: fallingXRef.current });
      }

      const currentX = gsap.getProperty(fallingRef.current, "x") as number;
      const distance = Math.abs(typeof currentX === "number" ? currentX : 0);
      let points = 0;

      if (distance <= 2) points = 100;
      else if (distance <= 5) points = 90;
      else if (distance <= 10) points = 75;
      else if (distance <= 20) points = 50;
      else if (distance <= 40) points = 25;

      setTimeout(() => {
        if (correctCharRef.current) {
          gsap.to(correctCharRef.current, {
            opacity: 1,
            duration: 0.6,
            ease: "power2.out",
          });
        }
      }, RED_REVEAL_DELAY);

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
      }, NOTE_REVEAL_DELAY);

      setTimeout(() => {
        onAnswer(points >= 50);
      }, NOTE_REVEAL_DELAY + 2500);
    };
  }, [onAnswer]);

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
      tl.to({}, { duration: 0.8 });
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

  useEffect(() => {
    if (phase === "intro" || phase === "playing") {
      if (correctCharRef.current) {
        gsap.set(correctCharRef.current, { opacity: 0 });
      }
    }
  }, [phase, currentWord]);

  // Düşen harf mount olur olmaz üst pozisyona al — y:0 flaşını önle
  useLayoutEffect(() => {
    if (phase !== "playing" || landed) return;
    const el = fallingRef.current;
    if (!el) return;

    const startY = getFallStartY();
    gsap.set(el, {
      y: startY,
      x: fallingXRef.current,
      visibility: "hidden",
    });
  }, [phase, landed, round, getFallStartY]);

  useEffect(() => {
    if (phase !== "playing" || !isPlaying || landed) return;

    const el = fallingRef.current;
    if (!el) return;

    let frameId = 0;

    const startFall = () => {
      const startY = getFallStartY();

      if (Math.abs(startY) < 80) {
        gsap.set(el, { visibility: "hidden" });
        frameId = requestAnimationFrame(startFall);
        return;
      }

      gsap.set(el, { y: startY, x: fallingXRef.current, visibility: "visible" });

      animRef.current = gsap.to(el, {
        y: 0,
        duration: FALL_DURATION,
        ease: "none",
        onComplete: () => {
          const finalY = gsap.getProperty(el, "y") as number;
          if (Math.abs(finalY) > 0.5) return;
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

  // Süre bitince harfi anında aşağı indir
  useEffect(() => {
    if (!isPlaying || phase !== "playing" || landedRef.current || timeLeft > 0) return;

    if (fallingRef.current) {
      gsap.set(fallingRef.current, { y: 0, x: fallingXRef.current });
    }
    handleLandRef.current();
  }, [isPlaying, phase, timeLeft]);

  const moveLeft = useCallback(() => {
    if (landed || phase !== "playing" || !fallingRef.current) return;
    fallingXRef.current -= STEP_SIZE;
    gsap.set(fallingRef.current, { x: fallingXRef.current });
  }, [landed, phase]);

  const moveRight = useCallback(() => {
    if (landed || phase !== "playing" || !fallingRef.current) return;
    fallingXRef.current += STEP_SIZE;
    gsap.set(fallingRef.current, { x: fallingXRef.current });
  }, [landed, phase]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        leftKeyRef.current?.press();
        moveLeft();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        rightKeyRef.current?.press();
        moveRight();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        leftKeyRef.current?.release();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        rightKeyRef.current?.release();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [moveLeft, moveRight]);

  const wordChars = currentWord.word.split("");
  const charStyle = {
    fontSize: "clamp(120px, 22vw, 340px)",
    fontFamily: "var(--font-planc), serif",
    fontWeight: 600,
    letterSpacing: "0",
    lineHeight: 1,
  } as const;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-visible select-none"
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

      {/* SOL PANEL — avatar altı */}
      <div
        className="absolute top-0 left-0 z-10 flex flex-col"
        style={{ paddingLeft: "24px", gap: "12px" }}
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

        <div ref={controlsRef} style={{ opacity: 0, display: "flex", gap: "8px" }}>
          <ArrowKeycap
            ref={leftKeyRef}
            direction="left"
            onPress={moveLeft}
            ariaLabel="Move left"
          />
          <ArrowKeycap
            ref={rightKeyRef}
            direction="right"
            onPress={moveRight}
            ariaLabel="Move right"
          />
        </div>

        {/* Uyarı kutusu — ok tuşlarının hemen altında */}
        <div
          ref={noteRef}
          style={{
            opacity: 0,
            transform: "scaleX(0) scaleY(0)",
            transformOrigin: "top left",
            backgroundColor: "#1A1A1A",
            padding: "10px 12px",
            width: "190px",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-planc), serif",
              fontWeight: 450,
              fontSize: "10px",
              lineHeight: "14px",
              color: "#FFFFFF",
            }}
          >
            Yes, we think that&apos;s the right kerning. Got a problem with it?
            Cry here → info@artistudyo.com
          </p>
        </div>
      </div>

      {/* KELİME — sabit katman */}
      {(phase === "intro" || phase === "playing" || phase === "landed") && (
        <div
          ref={wordAreaRef}
          className="absolute left-[3%] right-[3%] z-[5] flex flex-col items-stretch"
          style={{ bottom: WORD_BOTTOM, gap: 0 }}
        >
          <div className="flex justify-center">
            <div
              ref={wordTextRef}
              className="relative inline-flex justify-center items-end leading-none"
            >
              {wordChars.map((char, i) => (
                <span
                  key={`static-${i}`}
                  style={{
                    ...charStyle,
                    color:
                      i === currentWord.missingIndex
                        ? "transparent"
                        : "#1A1A1A",
                  }}
                >
                  {char}
                </span>
              ))}

              <div
                ref={correctCharRef}
                className="absolute inset-0 flex justify-center items-end pointer-events-none"
                style={{ opacity: 0 }}
              >
                {wordChars.map((char, i) => (
                  <span
                    key={`correct-${i}`}
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
            </div>
          </div>

          <div
            className="pointer-events-none shrink-0"
            style={{
              width: "100%",
              height: "1.5px",
              backgroundColor: "#1A1A1A",
            }}
          />
        </div>
      )}

      {/* DÜŞEN HARF — kelime satırıyla aynı hizada */}
      {(phase === "playing" || phase === "landed") && (
        <div
          className="absolute left-[3%] right-[3%] z-[25] flex flex-col pointer-events-none"
          style={{ bottom: WORD_BOTTOM }}
        >
          <div className="flex justify-center">
            <div className="relative inline-flex justify-center items-end leading-none">
              {wordChars.map((char, i) => (
                <span
                  key={`ghost-${i}`}
                  aria-hidden
                  style={{ ...charStyle, visibility: "hidden" }}
                >
                  {char}
                </span>
              ))}
              <div
                ref={fallingRef}
                className="absolute inset-0 flex justify-center items-end pointer-events-none"
                style={{ visibility: "hidden" }}
              >
                {wordChars.map((char, i) => (
                  <span
                    key={`falling-${i}`}
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
          <div style={{ height: "1.5px", visibility: "hidden" }} />
        </div>
      )}

    </div>
  );
}
