"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import gsap from "gsap";
import { GameDescBox } from "@/components/GameDescBox";
import ScoreFlyPopup from "@/components/games/ScoreFlyPopup";
import {
  getRetinaShapeLabel,
  getRetinaShapeStyle,
  getRevealMeetOverlap,
  pickRetinaVariation,
  type RetinaVariation,
} from "@/lib/retinaCheckVariations";

interface RetinaCheckProps {
  gameKey: string;
  isPlaying: boolean;
  shellReady: boolean;
  onAnswer: (correct: boolean) => void;
  onGameStart: () => void;
  addRoundScore: (points: number) => void;
  onGameComplete?: () => void;
  /** Test: 0=kare, 1=daire, 2=üçgen … */
  sequenceIndex?: number;
  round: number;
  timeLeft: number;
}

type Phase = "waiting" | "intro" | "playing" | "reveal" | "scored";
type Side = "left" | "right";

const BASE_SIZE = 132;
const SIZE_DIFF = 2;
const INTRO_HOLD = 2;
const REVEAL_MEET_DURATION = 1.15;
const REVEAL_ZOOM_DURATION = 1.65;
const SCORE_AFTER_REVEAL = 800;
const DESC_GAP = 36;

/**
 * Reveal (zoom sonrası) layout — Figma ile hizala
 *
 * Görsel üst kenar ≈ bh - scaledH * (1 - BOTTOM_CLIP_RATIO)
 * Alt anchor ≈ bh + scaledH * BOTTOM_CLIP_RATIO  (yarısı ekran dışı)
 *
 * ÖNEMLİ: transformOrigin "50% 100%" iken x = bw/2 - totalW/2 olmalı.
 * scaledW ile x hesaplamak sola kaydırır (scale zaten merkezden büyür).
 */
const BOTTOM_CLIP_RATIO = 0.5;
const TARGET_WIDTH_RATIO = 1;
const MEET_BOTTOM_RATIO = 0.92;

function computeRevealLayout(
  bw: number,
  bh: number,
  totalW: number,
  maxH: number,
  meetOverlap = 0,
) {
  const effectiveW = totalW - meetOverlap;
  const zoomScale = (bw * TARGET_WIDTH_RATIO) / effectiveW;
  const scaledH = maxH * zoomScale;
  const visualCenterX = effectiveW / 2;
  const centerX = bw / 2 - visualCenterX;
  const originXPercent =
    meetOverlap > 0 ? (visualCenterX / totalW) * 100 : 50;
  const finalY = bh + scaledH * BOTTOM_CLIP_RATIO - maxH;

  return { zoomScale, centerX, finalY, scaledH, originXPercent, effectiveW };
}

function usePageZoomPenalty() {
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    const initialDpr = window.devicePixelRatio;

    const evaluate = () => {
      let bad = false;
      const vv = window.visualViewport;
      if (vv && Math.abs(vv.scale - 1) > 0.06) bad = true;
      if (Math.abs(window.devicePixelRatio - initialDpr) > 0.05) bad = true;
      if (
        window.outerWidth > 0 &&
        window.innerWidth > 0 &&
        Math.abs(window.outerWidth / window.innerWidth - 1) > 0.08
      ) {
        bad = true;
      }
      setIsZoomed(bad);
    };

    evaluate();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", evaluate);
    vv?.addEventListener("scroll", evaluate);
    window.addEventListener("resize", evaluate);
    return () => {
      vv?.removeEventListener("resize", evaluate);
      vv?.removeEventListener("scroll", evaluate);
      window.removeEventListener("resize", evaluate);
    };
  }, []);

  return isZoomed;
}

export default function RetinaCheck({
  gameKey,
  isPlaying,
  shellReady,
  onAnswer,
  onGameStart,
  addRoundScore,
  onGameComplete,
  sequenceIndex,
}: RetinaCheckProps) {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [biggerSide, setBiggerSide] = useState<Side>("left");
  const [variation, setVariation] = useState<RetinaVariation>(() =>
    pickRetinaVariation(
      sequenceIndex !== undefined ? { sequenceIndex } : undefined,
    ),
  );
  const [flyScore, setFlyScore] = useState<number | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const pairRef = useRef<HTMLDivElement>(null);
  const leftShapeRef = useRef<HTMLButtonElement>(null);
  const rightShapeRef = useRef<HTMLButtonElement>(null);
  const introCardRef = useRef<HTMLDivElement>(null);
  const descBoxRef = useRef<HTMLDivElement>(null);
  const scoreAnchorRef = useRef<HTMLDivElement>(null);
  const pickedRef = useRef(false);
  const revealPendingRef = useRef(false);
  const revealPointsRef = useRef(0);
  const onGameStartRef = useRef(onGameStart);
  useEffect(() => {
    onGameStartRef.current = onGameStart;
  });
  const shapeLabel = getRetinaShapeLabel(variation.shape);
  const isZoomed = usePageZoomPenalty();
  const gsapControlsSize = phase === "reveal" || phase === "scored";

  const leftSize = biggerSide === "left" ? BASE_SIZE + SIZE_DIFF : BASE_SIZE;
  const rightSize = biggerSide === "right" ? BASE_SIZE + SIZE_DIFF : BASE_SIZE;
  const pairWidth = leftSize + rightSize;
  const pairHeight = Math.max(leftSize, rightSize);

  const leftShapeStyle = getRetinaShapeStyle(
    variation.shape,
    variation.color,
    leftSize,
  );
  const rightShapeStyle = getRetinaShapeStyle(
    variation.shape,
    variation.color,
    rightSize,
  );
  if (gsapControlsSize) {
    delete leftShapeStyle.width;
    delete leftShapeStyle.height;
    delete rightShapeStyle.width;
    delete rightShapeStyle.height;
  }

  const getBoardMetrics = useCallback(() => {
    const board = boardRef.current;
    const desc = descBoxRef.current;
    if (!board) return null;

    const bw = board.clientWidth;
    const bh = board.clientHeight;
    const boardRect = board.getBoundingClientRect();

    let safeLeft = 230;
    let safeTop = 16;
    if (desc) {
      const dr = desc.getBoundingClientRect();
      safeLeft = dr.right - boardRect.left + DESC_GAP;
      safeTop = dr.bottom - boardRect.top + DESC_GAP;
    }

    return { bw, bh, safeLeft, safeTop };
  }, []);

  const layoutScattered = useCallback(() => {
    const board = boardRef.current;
    const pair = pairRef.current;
    const right = rightShapeRef.current;
    const metrics = getBoardMetrics();
    if (!board || !pair || !right || !metrics) return;

    const { bw, bh, safeLeft, safeTop } = metrics;
    const maxShape = BASE_SIZE + SIZE_DIFF;

    const pairX = Math.min(
      Math.max(safeLeft, bw * 0.34),
      bw - maxShape * 2 - 48,
    );
    const pairY = Math.min(Math.max(safeTop, bh * 0.38), bh - maxShape - 120);

    const scatterX = Math.min(bw * 0.3, bw - pairX - maxShape - 24);
    const scatterY = Math.min(bh * 0.2, bh - pairY - maxShape - 24);

    gsap.set(pair, {
      x: pairX,
      y: pairY,
      scale: 1,
      transformOrigin: "50% 100%",
    });
    if (leftShapeRef.current) {
      gsap.set(leftShapeRef.current, { x: 0, y: 0 });
    }
    gsap.set(right, {
      x: Math.max(scatterX, maxShape + 40),
      y: Math.max(scatterY, 48),
    });
  }, [getBoardMetrics]);

  const resetShapeTransforms = useCallback(() => {
    if (pairRef.current) {
      gsap.set(pairRef.current, { scale: 1, x: 0, y: 0 });
    }
    if (leftShapeRef.current) {
      gsap.set(leftShapeRef.current, { x: 0, y: 0, width: "", height: "" });
    }
    if (rightShapeRef.current) {
      gsap.set(rightShapeRef.current, { x: 0, y: 0, width: "", height: "" });
    }
  }, []);

  const runRevealAnimation = useCallback(
    (onDone: () => void) => {
      const board = boardRef.current;
      const pair = pairRef.current;
      const left = leftShapeRef.current;
      const right = rightShapeRef.current;
      if (!board || !pair || !left || !right) return;

      const bw = board.clientWidth;
      const bh = board.clientHeight;
      const leftW = biggerSide === "left" ? BASE_SIZE + SIZE_DIFF : BASE_SIZE;
      const rightW = biggerSide === "right" ? BASE_SIZE + SIZE_DIFF : BASE_SIZE;
      const totalW = leftW + rightW;
      const maxH = Math.max(leftW, rightW);

      const meetOverlap = getRevealMeetOverlap(
        variation.shape,
        leftW,
        rightW,
      );
      const rightMeetX = leftW - meetOverlap;
      const useDimensionZoom = variation.shape !== "square";

      const { zoomScale, centerX, finalY, scaledH, effectiveW } =
        computeRevealLayout(bw, bh, totalW, maxH, meetOverlap);

      const meetX = centerX;
      const meetY = bh * MEET_BOTTOM_RATIO - maxH;
      const leftMeetY = maxH - leftW;
      const rightMeetY = maxH - rightW;
      const finalDimY = bh + scaledH * BOTTOM_CLIP_RATIO - maxH * zoomScale;
      const finalPairX = bw / 2 - (effectiveW * zoomScale) / 2;

      gsap.killTweensOf([left, right, pair]);
      gsap.set(pair, { transformOrigin: "50% 100%", scale: 1 });
      gsap.set([left, right], { transformOrigin: "50% 100%" });

      const tl = gsap.timeline({ onComplete: onDone });

      // 1) Dağınık konumdan taban hizalı yan yana — Figma meet
      tl.to(
        left,
        {
          x: 0,
          y: leftMeetY,
          duration: REVEAL_MEET_DURATION,
          ease: "power3.inOut",
        },
        0,
      );

      tl.to(
        right,
        {
          x: rightMeetX,
          y: rightMeetY,
          duration: REVEAL_MEET_DURATION,
          ease: "power3.inOut",
        },
        0,
      );

      tl.to(
        pair,
        {
          x: meetX,
          y: meetY,
          duration: REVEAL_MEET_DURATION,
          ease: "power3.inOut",
        },
        0,
      );

      // 2) Yan yana geldikten sonra büyüt
      if (useDimensionZoom) {
        // Daire/üçgen: CSS scale bitmap'i büyütür → pikselleşme. Gerçek boyut animasyonu.
        tl.to(
          left,
          {
            width: leftW * zoomScale,
            height: leftW * zoomScale,
            y: leftMeetY * zoomScale,
            duration: REVEAL_ZOOM_DURATION,
            ease: "power2.inOut",
          },
          REVEAL_MEET_DURATION,
        );
        tl.to(
          right,
          {
            width: rightW * zoomScale,
            height: rightW * zoomScale,
            x: rightMeetX * zoomScale,
            y: rightMeetY * zoomScale,
            duration: REVEAL_ZOOM_DURATION,
            ease: "power2.inOut",
          },
          REVEAL_MEET_DURATION,
        );
        tl.to(
          pair,
          {
            x: finalPairX,
            y: finalDimY,
            duration: REVEAL_ZOOM_DURATION,
            ease: "power2.inOut",
          },
          REVEAL_MEET_DURATION,
        );
      } else {
        tl.to(
          pair,
          {
            scale: zoomScale,
            y: finalY,
            transformOrigin: "50% 100%",
            duration: REVEAL_ZOOM_DURATION,
            ease: "power2.inOut",
          },
          REVEAL_MEET_DURATION,
        );
      }
    },
    [biggerSide, variation.shape],
  );

  const handlePick = useCallback(
    (side: Side) => {
      if (phase !== "playing" || !isPlaying || pickedRef.current || isZoomed)
        return;
      pickedRef.current = true;
      revealPendingRef.current = true;
      setPhase("reveal");

      const correct = side === biggerSide;
      const points = correct ? 1000 : 0;

      revealPointsRef.current = points;
    },
    [biggerSide, isPlaying, isZoomed, phase],
  );

  useLayoutEffect(() => {
    if (phase !== "reveal" || !revealPendingRef.current) return;
    revealPendingRef.current = false;

    const left = leftShapeRef.current;
    const right = rightShapeRef.current;
    const leftW = biggerSide === "left" ? BASE_SIZE + SIZE_DIFF : BASE_SIZE;
    const rightW = biggerSide === "right" ? BASE_SIZE + SIZE_DIFF : BASE_SIZE;
    const maxH = Math.max(leftW, rightW);

    if (left) {
      gsap.set(left, { width: leftW, height: leftW });
    }
    if (right) {
      gsap.set(right, { width: rightW, height: rightW });
    }

    runRevealAnimation(() => {
      setTimeout(() => {
        setFlyScore(revealPointsRef.current);
      }, SCORE_AFTER_REVEAL);
    });
  }, [phase, biggerSide, runRevealAnimation]);

  const handleScoreFlyComplete = useCallback(
    (points: number) => {
      addRoundScore(points);
      setFlyScore(null);
      setPhase("scored");
      onAnswer(points >= 500);
      onGameComplete?.();
    },
    [addRoundScore, onAnswer, onGameComplete],
  );

  useEffect(() => {
    if (!shellReady) return;

    let cancelled = false;
    const nextSide: Side = Math.random() < 0.5 ? "left" : "right";

    queueMicrotask(() => {
      if (cancelled) return;
      pickedRef.current = false;
      revealPendingRef.current = false;
      setBiggerSide(nextSide);
      setVariation(
        pickRetinaVariation(
          sequenceIndex !== undefined ? { sequenceIndex } : undefined,
        ),
      );
      setFlyScore(null);
      setPhase("intro");
    });

    return () => {
      cancelled = true;
    };
  }, [shellReady, gameKey, sequenceIndex]);

  useEffect(() => {
    if (!shellReady || phase !== "intro") return;

    resetShapeTransforms();

    const skipIntro = sequenceIndex !== undefined && sequenceIndex > 0;
    if (skipIntro) {
      queueMicrotask(() => {
        setPhase("playing");
        onGameStartRef.current();
      });
      return;
    }

    const card = introCardRef.current;
    const descBox = descBoxRef.current;

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

    if (card) {
      tl.fromTo(
        card,
        { y: "100vh", opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "back.out(1.2)" },
        0.12,
      );
      tl.to({}, { duration: INTRO_HOLD });
      tl.to(card, {
        y: "100vh",
        opacity: 0,
        duration: 0.65,
        ease: "power2.in",
      });
    }

    return () => {
      tl.kill();
    };
  }, [shellReady, gameKey, phase, resetShapeTransforms, sequenceIndex]);

  useLayoutEffect(() => {
    if (phase !== "playing") return;
    layoutScattered();
    window.addEventListener("resize", layoutScattered);
    return () => window.removeEventListener("resize", layoutScattered);
  }, [phase, biggerSide, layoutScattered]);

  return (
    <div
      className="absolute inset-0 overflow-hidden select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        ref={introCardRef}
        className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
        style={{ opacity: 0 }}
      >
        <div
          className="bg-white/95 backdrop-blur-sm rounded-[40px] px-12 py-8 flex flex-col items-center text-center shadow-lg"
          style={{ maxWidth: "520px" }}
        >
          <h2
            className="font-bold text-[#1A1A1A] mb-3"
            style={{
              fontSize: "clamp(28px, 5vw, 42px)",
              fontFamily: "var(--font-planc), serif",
            }}
          >
            RETINA CHECK
          </h2>
          <p
            className="text-[14px] text-[#555] leading-relaxed max-w-[420px]"
            style={{ fontFamily: "var(--font-planc), serif" }}
          >
            Pick the shape that&apos;s 2px bigger and prove your eyes are
            unnecessarily calibrated for absolutely no reason.
          </p>
        </div>
      </div>

      <GameDescBox ref={descBoxRef} title="RETINA CHECK">
        Pick the shape that&apos;s 2px bigger and prove your eyes are
        unnecessarily calibrated for absolutely no reason.
      </GameDescBox>

      <div ref={boardRef} className="absolute inset-0 z-[1] overflow-hidden">
        <div
          ref={scoreAnchorRef}
          className="absolute left-1/2 top-[22%] -translate-x-1/2 pointer-events-none z-20"
          style={{ width: 1, height: 1 }}
        />

        {(phase === "playing" || phase === "reveal" || phase === "scored") && (
          <div
            ref={pairRef}
            className="absolute left-0 top-0 will-change-transform overflow-visible"
            style={{ width: pairWidth, height: pairHeight }}
          >
            <button
              ref={leftShapeRef}
              type="button"
              disabled={phase !== "playing" || isZoomed}
              onClick={() => handlePick("left")}
              className="absolute left-0 top-0 cursor-pointer outline-none disabled:cursor-default"
              style={leftShapeStyle}
              aria-label={`Sol ${shapeLabel} — 2 piksel daha büyük olanı seç`}
            />
            <button
              ref={rightShapeRef}
              type="button"
              disabled={phase !== "playing" || isZoomed}
              onClick={() => handlePick("right")}
              className="absolute left-0 top-0 cursor-pointer outline-none disabled:cursor-default"
              style={rightShapeStyle}
              aria-label={`Sağ ${shapeLabel} — 2 piksel daha büyük olanı seç`}
            />
          </div>
        )}
      </div>

      {isZoomed && phase === "playing" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center px-8 text-center">
          <p
            className="rounded-lg bg-white/95 px-6 py-4 text-sm font-medium text-[#1A1A1A]"
            style={{ fontFamily: "var(--font-planc), serif" }}
          >
            Zoom yaparak hile yapamazsın
          </p>
        </div>
      )}

      {flyScore !== null && (
        <ScoreFlyPopup
          key={flyScore}
          points={flyScore}
          anchorRef={scoreAnchorRef}
          flyTargetLift={100}
          onComplete={() => handleScoreFlyComplete(flyScore)}
        />
      )}
    </div>
  );
}
