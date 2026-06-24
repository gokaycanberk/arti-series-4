"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import ArrowKeycap, { type ArrowKeycapHandle } from "@/components/ArrowKeycap";
import { GameDescBox, DESC_BOX_LEFT, DESC_BOX_TOP } from "@/components/GameDescBox";
import ScoreFlyPopup from "@/components/games/ScoreFlyPopup";
import { scoreFromDistance } from "@/components/games/scoreUtils";

interface OpticalPanicProps {
  gameKey: string;
  isPlaying: boolean;
  shellReady: boolean;
  onAnswer: (correct: boolean) => void;
  onGameStart: () => void;
  addRoundScore: (points: number) => void;
  onGameComplete?: () => void;
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

function getInkBottom(el: HTMLElement): number {
  const range = document.createRange();
  range.selectNodeContents(el);
  const rects = range.getClientRects();
  if (rects.length === 0) {
    return el.getBoundingClientRect().bottom;
  }
  let bottom = 0;
  for (const rect of rects) {
    bottom = Math.max(bottom, rect.bottom);
  }
  return bottom;
}

export default function OpticalPanic({
  gameKey,
  isPlaying,
  shellReady,
  onAnswer,
  onGameStart,
  addRoundScore,
  onGameComplete,
  round,
  timeLeft,
}: OpticalPanicProps) {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [currentWord, setCurrentWord] = useState(WORDS[0]!);
  const [landed, setLanded] = useState(false);
  const [flyScore, setFlyScore] = useState<number | null>(null);

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
  const wordRowRef = useRef<HTMLDivElement>(null);
  const baselineRef = useRef<HTMLDivElement>(null);
  const scoreAnchorRef = useRef<HTMLDivElement>(null);
  const fallingAreaRef = useRef<HTMLDivElement>(null);
  const fallingWordRowRef = useRef<HTMLDivElement>(null);
  const fallingWordWrapRef = useRef<HTMLDivElement>(null);
  const handleLandRef = useRef<() => void>(() => {});
  const landedRef = useRef(false);
  const onGameStartRef = useRef(onGameStart);
  useEffect(() => {
    onGameStartRef.current = onGameStart;
  });

  const FALL_DURATION = 10;
  const STEP_SIZE = 2;
  const RED_REVEAL_DELAY = 3000;
  const SCORE_REVEAL_DELAY = 200;
  const NOTE_AFTER_SCORE_DELAY = 400;

  const getFallStartY = useCallback(() => {
    const container = containerRef.current;
    const wordText = wordTextRef.current;
    const baseline = baselineRef.current;
    if (!container || !wordText) return -1200;

    const containerRect = container.getBoundingClientRect();
    const anchorRect = (baseline ?? wordText).getBoundingClientRect();
    const baselineFromTop = anchorRect.top - containerRect.top;

    return -(baselineFromTop - SPAWN_OFFSET_FROM_TOP);
  }, []);

  const syncFallingRow = useCallback(() => {
    const wordRow = wordRowRef.current;
    const fallingRow = fallingWordRowRef.current;
    const fallingArea = fallingAreaRef.current;
    if (!wordRow || !fallingRow || !fallingArea) return;

    const wordTop = wordRow.getBoundingClientRect().top;
    const areaTop = fallingArea.getBoundingClientRect().top;
    fallingRow.style.transform = `translateY(${wordTop - areaTop}px)`;
  }, []);

  const trimFontDeadSpace = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    el.style.marginBottom = "0";

    const wraps = el.querySelectorAll<HTMLElement>(".optical-panic-char-wrap");
    wraps.forEach((wrap) => {
      wrap.style.marginBottom = "0";
      const glyph = wrap.querySelector<HTMLElement>(".optical-panic-glyph");
      if (!glyph) return;

      const wrapRect = wrap.getBoundingClientRect();
      const inkBottom = getInkBottom(glyph);
      const deadSpace = wrapRect.bottom - inkBottom;
      if (deadSpace > 0.5) {
        wrap.style.marginBottom = `-${deadSpace}px`;
      }
    });
  }, []);

  const alignBaseline = useCallback(() => {
    const text = wordTextRef.current;
    const line = baselineRef.current;
    const row = wordRowRef.current;
    if (!text || !row) return;

    row.style.transform = "none";
    if (scoreAnchorRef.current) scoreAnchorRef.current.style.transform = "none";
    if (fallingWordRowRef.current) fallingWordRowRef.current.style.transform = "none";
    if (line) line.style.marginTop = "0";

    trimFontDeadSpace(text);
    trimFontDeadSpace(fallingWordWrapRef.current);

    if (line) {
      const glyphs = text.querySelectorAll<HTMLElement>(".optical-panic-glyph");
      let inkBottom = 0;
      glyphs.forEach((glyph) => {
        inkBottom = Math.max(inkBottom, getInkBottom(glyph));
      });
      const gap = line.getBoundingClientRect().top - inkBottom;
      if (gap > 0.5) {
        line.style.marginTop = `-${gap}px`;
      }
    }

    syncFallingRow();
  }, [syncFallingRow, trimFontDeadSpace]);

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
    if (wordTextRef.current) {
      wordTextRef.current.style.transform = "";
      wordTextRef.current.style.marginBottom = "0";
      wordTextRef.current
        .querySelectorAll<HTMLElement>(".optical-panic-char-wrap")
        .forEach((wrap) => {
          wrap.style.marginBottom = "0";
        });
    }
    if (baselineRef.current) {
      baselineRef.current.style.marginTop = "0";
    }
    if (wordRowRef.current) {
      wordRowRef.current.style.transform = "";
    }
    if (fallingWordRowRef.current) {
      fallingWordRowRef.current.style.transform = "";
    }
    if (fallingWordWrapRef.current) {
      fallingWordWrapRef.current.style.transform = "";
      fallingWordWrapRef.current.style.marginBottom = "0";
      fallingWordWrapRef.current
        .querySelectorAll<HTMLElement>(".optical-panic-char-wrap")
        .forEach((wrap) => {
          wrap.style.marginBottom = "0";
        });
    }
    setLanded(false);
    landedRef.current = false;
    setFlyScore(null);
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
      const points = scoreFromDistance(distance);

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
        setFlyScore(points);
      }, RED_REVEAL_DELAY + SCORE_REVEAL_DELAY);
    };
  }, [addRoundScore, onAnswer]);

  useEffect(() => {
    if (!shellReady) return;

    queueMicrotask(() => {
      prepareRound();
      setPhase("intro");
    });

    const card = introCardRef.current;
    const descBox = descBoxRef.current;
    const controls = controlsRef.current;

    const tl = gsap.timeline({
      onComplete: () => {
        setPhase("playing");
        onGameStartRef.current();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shellReady, gameKey]);

  useEffect(() => {
    if (phase === "intro" || phase === "playing") {
      if (correctCharRef.current) {
        gsap.set(correctCharRef.current, { opacity: 0 });
      }
    }
  }, [phase, currentWord]);

  useLayoutEffect(() => {
    const run = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(alignBaseline);
      });
    };

    if (phase === "intro" || phase === "playing" || phase === "landed") {
      run();
      void document.fonts.ready.then(run);
    }

    window.addEventListener("resize", alignBaseline);
    return () => window.removeEventListener("resize", alignBaseline);
  }, [phase, currentWord, alignBaseline]);

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

      alignBaseline();
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
  }, [phase, isPlaying, landed, round, getFallStartY, alignBaseline]);

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

  const handleScoreFlyComplete = useCallback(
    (points: number) => {
      addRoundScore(points);
      setFlyScore(null);

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
      }, NOTE_AFTER_SCORE_DELAY);

      setTimeout(() => {
        onAnswer(points >= 500);
        onGameComplete?.();
      }, NOTE_AFTER_SCORE_DELAY + 2000);
    },
    [addRoundScore, onAnswer, onGameComplete],
  );

  const wordChars = currentWord.word.split("");
  const charStyle = {
    fontSize: "clamp(120px, 22vw, 340px)",
    fontFamily: "var(--font-planc), serif",
    fontWeight: 600,
    letterSpacing: "0",
    lineHeight: 1,
    display: "block",
  } as const;

  const wordTextStyle = {
    lineHeight: 0,
    margin: 0,
    padding: 0,
  } as const;

  const renderGlyph = (
    char: string,
    key: string,
    color: string,
    extra?: CSSProperties,
  ) => (
    <span key={key} className="optical-panic-char-wrap inline-block align-bottom leading-0">
      <span
        className="optical-panic-glyph block"
        style={{ ...charStyle, color, ...extra }}
      >
        {char}
      </span>
    </span>
  );

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

      <GameDescBox ref={descBoxRef} title="OPTICAL PANIC">
        Use the arrow keys to guide the falling letter into the right spot then
        press done and let&apos;s see how type nerd you really are.
      </GameDescBox>

      <div
        className="absolute z-10 flex flex-col"
        style={{ left: DESC_BOX_LEFT, top: DESC_BOX_TOP + 108, gap: 12 }}
      >
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
          className="absolute left-[3%] right-[3%] z-[5] flex flex-col leading-none"
          style={{ bottom: WORD_BOTTOM }}
        >
          <div className="relative flex justify-center">
            <div
              ref={scoreAnchorRef}
              className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
              style={{
                bottom: "100%",
                marginBottom: "clamp(140px, calc(28vh - 30px), 260px)",
              }}
            />
            <div ref={wordRowRef} className="flex justify-center">
              <div
                ref={wordTextRef}
                className="relative inline-flex justify-center items-end leading-[0]"
                style={wordTextStyle}
              >
                {wordChars.map((char, i) =>
                  renderGlyph(
                    char,
                    `static-${i}`,
                    i === currentWord.missingIndex ? "transparent" : "#1A1A1A",
                  ),
                )}

                <div
                  ref={correctCharRef}
                  className="absolute inset-0 flex justify-center items-end pointer-events-none"
                  style={{ opacity: 0 }}
                >
                  {wordChars.map((char, i) =>
                    renderGlyph(
                      char,
                      `correct-${i}`,
                      i === currentWord.missingIndex ? "#CC2222" : "transparent",
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
          <div
            ref={baselineRef}
            className="h-[1.5px] w-full shrink-0 bg-[#1A1A1A] pointer-events-none"
          />
        </div>
      )}

      {/* DÜŞEN HARF — kelime satırıyla aynı hizada */}
      {(phase === "playing" || phase === "landed") && (
        <div
          ref={fallingAreaRef}
          className="absolute left-[3%] right-[3%] z-[25] pointer-events-none flex flex-col leading-none"
          style={{ bottom: WORD_BOTTOM }}
        >
          <div ref={fallingWordRowRef} className="flex justify-center">
            <div
              ref={fallingWordWrapRef}
              className="relative inline-flex justify-center items-end leading-[0]"
              style={wordTextStyle}
            >
              {wordChars.map((char, i) =>
                renderGlyph(char, `ghost-${i}`, "#1A1A1A", {
                  visibility: "hidden",
                }),
              )}
              <div
                ref={fallingRef}
                className="absolute inset-0 flex justify-center items-end pointer-events-none"
                style={{ visibility: "hidden" }}
              >
                {wordChars.map((char, i) =>
                  renderGlyph(
                    char,
                    `falling-${i}`,
                    i === currentWord.missingIndex ? "#1A1A1A" : "transparent",
                  ),
                )}
              </div>
            </div>
          </div>
          <div aria-hidden className="h-[1.5px] w-full shrink-0" />
        </div>
      )}

      {flyScore !== null && (
        <ScoreFlyPopup
          key={flyScore}
          points={flyScore}
          anchorRef={scoreAnchorRef}
          onComplete={() => handleScoreFlyComplete(flyScore)}
        />
      )}

    </div>
  );
}
