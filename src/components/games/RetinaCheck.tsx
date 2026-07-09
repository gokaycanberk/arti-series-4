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
import { GameIntroOverlay } from "@/components/GameIntroOverlay";
import ScoreFlyPopup from "@/components/games/ScoreFlyPopup";
import {
  introPendingPhase,
  prepareGameContentHidden,
  runGameContentReveal,
  shouldSkipIntroCard,
} from "@/lib/gameIntro";
import { useGameIntroPlay } from "@/lib/useGameIntroPlay";
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
  onIntroComplete: () => void;
  addRoundScore: (points: number) => void;
  onGameComplete?: () => void;
  /** Test: 0=kare, 1=daire, 2=üçgen … */
  sequenceIndex?: number;
  attemptIndex?: number;
  round: number;
  timeLeft: number;
}

type Phase = "waiting" | "intro" | "playing" | "reveal" | "scored";
type Side = "left" | "right";

const BASE_SIZE = 132;
const SIZE_DIFF = 2;
/** Üçgen reveal — tepe hizası kıyas çizgisi */
const REVEAL_GUIDE_COLOR = "rgb(0, 255, 255)";
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
/** Üçgen reveal — skor panelinin altında kalsın */
const TRIANGLE_BOTTOM_CLIP_RATIO = 0.64;
const TARGET_WIDTH_RATIO = 1;
const MEET_BOTTOM_RATIO = 0.92;
const TRIANGLE_MEET_BOTTOM_RATIO = 0.98;

function revealBottomClip(shape: RetinaVariation["shape"]) {
  return shape === "triangle" ? TRIANGLE_BOTTOM_CLIP_RATIO : BOTTOM_CLIP_RATIO;
}

function revealMeetBottomRatio(shape: RetinaVariation["shape"]) {
  return shape === "triangle" ? TRIANGLE_MEET_BOTTOM_RATIO : MEET_BOTTOM_RATIO;
}

function computeRevealLayout(
  bw: number,
  bh: number,
  totalW: number,
  maxH: number,
  meetOverlap = 0,
  bottomClipRatio = BOTTOM_CLIP_RATIO,
) {
  const effectiveW = totalW - meetOverlap;
  const zoomScale = (bw * TARGET_WIDTH_RATIO) / effectiveW;
  const scaledH = maxH * zoomScale;
  const visualCenterX = effectiveW / 2;
  const centerX = bw / 2 - visualCenterX;
  const originXPercent = meetOverlap > 0 ? (visualCenterX / totalW) * 100 : 50;
  const finalY = bh + scaledH * bottomClipRatio - maxH;

  return { zoomScale, centerX, finalY, scaledH, originXPercent, effectiveW };
}

type ZoomBaseline = {
  scale: number;
  dpr: number;
  widthRatio: number;
};

function readZoomMetrics(): ZoomBaseline {
  const vv = window.visualViewport;
  return {
    scale: vv?.scale ?? 1,
    dpr: window.devicePixelRatio,
    widthRatio:
      window.outerWidth > 0 && window.innerWidth > 0
        ? window.outerWidth / window.innerWidth
        : 1,
  };
}

/** Oyun başlangıç zoom’una göre baseline al — zoom denemesinde uyar, geri alınınca kaldır */
function usePageZoomPenalty(active: boolean) {
  const [isZoomed, setIsZoomed] = useState(false);
  const baselineRef = useRef<ZoomBaseline | null>(null);

  useEffect(() => {
    if (!active) {
      baselineRef.current = null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- oyun dışıyken durumu sıfırla
      setIsZoomed(false);
      return;
    }

    const captureBaseline = () => {
      baselineRef.current = readZoomMetrics();
    };

    const evaluate = () => {
      if (!baselineRef.current) {
        captureBaseline();
        return;
      }

      const cur = readZoomMetrics();
      const base = baselineRef.current;
      const changed =
        Math.abs(cur.scale - base.scale) > 0.04 ||
        Math.abs(cur.dpr - base.dpr) > 0.04 ||
        Math.abs(cur.widthRatio - base.widthRatio) > 0.06;

      setIsZoomed(changed);
    };

    const evaluateSoon = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(evaluate);
      });
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) evaluateSoon();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (
        e.key === "+" ||
        e.key === "-" ||
        e.key === "=" ||
        e.key === "0" ||
        e.key === "_"
      ) {
        evaluateSoon();
      }
    };

    const onGesture = () => evaluateSoon();

    setIsZoomed(false);
    captureBaseline();

    const settleId = window.setTimeout(() => {
      captureBaseline();
      evaluate();
    }, 120);

    const vv = window.visualViewport;
    vv?.addEventListener("resize", evaluate);
    vv?.addEventListener("scroll", evaluate);
    window.addEventListener("resize", evaluate);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("gesturestart", onGesture);
    window.addEventListener("gesturechange", onGesture);

    return () => {
      window.clearTimeout(settleId);
      vv?.removeEventListener("resize", evaluate);
      vv?.removeEventListener("scroll", evaluate);
      window.removeEventListener("resize", evaluate);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("gesturestart", onGesture);
      window.removeEventListener("gesturechange", onGesture);
    };
  }, [active]);

  return isZoomed;
}

export default function RetinaCheck({
  gameKey,
  isPlaying,
  shellReady,
  onAnswer,
  onGameStart,
  onIntroComplete,
  addRoundScore,
  onGameComplete,
  sequenceIndex,
  attemptIndex,
  timeLeft,
}: RetinaCheckProps) {
  const [phase, setPhase] = useState<Phase>("intro");
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
  const leftGuideRef = useRef<HTMLSpanElement>(null);
  const rightGuideRef = useRef<HTMLSpanElement>(null);
  const descBoxRef = useRef<HTMLDivElement>(null);
  const scoreAnchorRef = useRef<HTMLDivElement>(null);
  const pickedRef = useRef(false);
  const revealPendingRef = useRef(false);
  const revealPointsRef = useRef(0);
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
    setPhase("playing");
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

  const shapeLabel = getRetinaShapeLabel(variation.shape);
  const isZoomed = usePageZoomPenalty(phase === "playing");
  const gsapControlsSize = phase === "reveal" || phase === "scored";
  const showTriangleGuides =
    variation.shape === "triangle" &&
    (phase === "reveal" || phase === "scored");

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

  const runRevealAnimation = useCallback(
    (onDone: () => void) => {
      const board = boardRef.current;
      const pair = pairRef.current;
      const left = leftShapeRef.current;
      const right = rightShapeRef.current;
      const leftGuide = leftGuideRef.current;
      const rightGuide = rightGuideRef.current;
      if (!board || !pair || !left || !right) return;

      const bw = board.clientWidth;
      const bh = board.clientHeight;
      const leftW = biggerSide === "left" ? BASE_SIZE + SIZE_DIFF : BASE_SIZE;
      const rightW = biggerSide === "right" ? BASE_SIZE + SIZE_DIFF : BASE_SIZE;
      const totalW = leftW + rightW;
      const maxH = Math.max(leftW, rightW);

      const meetOverlap = getRevealMeetOverlap(variation.shape, leftW, rightW);
      const rightMeetX = leftW - meetOverlap;
      const bottomClip = revealBottomClip(variation.shape);
      const meetBottomRatio = revealMeetBottomRatio(variation.shape);

      const { zoomScale, centerX, scaledH, effectiveW } = computeRevealLayout(
        bw,
        bh,
        totalW,
        maxH,
        meetOverlap,
        bottomClip,
      );

      const scaledLeftW = Math.round(leftW * zoomScale);
      const scaledRightW = Math.round(rightW * zoomScale);
      const scaledRightX = Math.round(rightMeetX * zoomScale);
      const scaledLeftY = Math.round((maxH - leftW) * zoomScale);
      const scaledRightY = Math.round((maxH - rightW) * zoomScale);
      const scaledMaxH = Math.max(scaledLeftW, scaledRightW);
      const guideWidthMeet = Math.round(effectiveW);
      const guideWidthZoom = Math.round(effectiveW * zoomScale);
      const finalDimY = Math.round(
        bh + scaledH * bottomClip - scaledMaxH,
      );
      const finalPairX = Math.round(bw / 2 - (effectiveW * zoomScale) / 2);

      const meetX = centerX;
      const meetY = bh * meetBottomRatio - maxH;
      const leftMeetY = maxH - leftW;
      const rightMeetY = maxH - rightW;

      const dimSnap = { width: 1, height: 1, x: 1, y: 1 };

      gsap.killTweensOf(
        [left, right, pair, leftGuide, rightGuide].filter(Boolean),
      );
      gsap.set(pair, { transformOrigin: "50% 100%", scale: 1 });
      gsap.set([left, right], { transformOrigin: "50% 100%" });
      if (leftGuide) {
        gsap.set(leftGuide, {
          opacity: 0,
          left: 0,
          top: leftMeetY,
          width: guideWidthMeet,
        });
      }
      if (rightGuide) {
        gsap.set(rightGuide, {
          opacity: 0,
          left: 0,
          top: rightMeetY,
          width: guideWidthMeet,
        });
      }

      const tl = gsap.timeline({ onComplete: onDone });

      // 1) Dağınık konumdan taban hizalı yan yana — Figma meet
      tl.to(
        left,
        {
          x: 0,
          y: leftMeetY,
          duration: REVEAL_MEET_DURATION,
          ease: "power3.inOut",
          snap: dimSnap,
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
          snap: dimSnap,
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
          snap: dimSnap,
        },
        0,
      );

      // 2) CSS scale bitmap'i büyütür → pikselleşme; gerçek boyut animasyonu
      tl.to(
        left,
        {
          width: scaledLeftW,
          height: scaledLeftW,
          y: scaledLeftY,
          duration: REVEAL_ZOOM_DURATION,
          ease: "power2.inOut",
          snap: dimSnap,
        },
        REVEAL_MEET_DURATION,
      );
      tl.to(
        right,
        {
          width: scaledRightW,
          height: scaledRightW,
          x: scaledRightX,
          y: scaledRightY,
          duration: REVEAL_ZOOM_DURATION,
          ease: "power2.inOut",
          snap: dimSnap,
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
          snap: dimSnap,
        },
        REVEAL_MEET_DURATION,
      );

      if (variation.shape === "triangle" && leftGuide && rightGuide) {
        tl.to(
          leftGuide,
          {
            left: 0,
            top: leftMeetY,
            width: guideWidthMeet,
            opacity: 0,
            duration: REVEAL_MEET_DURATION,
            ease: "power3.inOut",
            snap: dimSnap,
          },
          0,
        );
        tl.to(
          rightGuide,
          {
            left: 0,
            top: rightMeetY,
            width: guideWidthMeet,
            opacity: 0,
            duration: REVEAL_MEET_DURATION,
            ease: "power3.inOut",
            snap: dimSnap,
          },
          0,
        );
        tl.to(
          leftGuide,
          {
            left: 0,
            top: scaledLeftY,
            width: guideWidthZoom,
            opacity: 1,
            duration: REVEAL_ZOOM_DURATION,
            ease: "power2.inOut",
            snap: dimSnap,
          },
          REVEAL_MEET_DURATION,
        );
        tl.to(
          rightGuide,
          {
            left: 0,
            top: scaledRightY,
            width: guideWidthZoom,
            opacity: 1,
            duration: REVEAL_ZOOM_DURATION,
            ease: "power2.inOut",
            snap: dimSnap,
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

  const handleTimeUp = useCallback(() => {
    if (phase !== "playing" || !isPlaying || pickedRef.current) return;
    pickedRef.current = true;
    revealPendingRef.current = true;
    revealPointsRef.current = 0;
    setPhase("reveal");
  }, [isPlaying, phase]);

  useEffect(() => {
    if (phase !== "playing" || !isPlaying || timeLeft > 0) return;
    handleTimeUp();
  }, [phase, isPlaying, timeLeft, handleTimeUp]);

  useLayoutEffect(() => {
    if (phase !== "reveal" || !revealPendingRef.current) return;
    revealPendingRef.current = false;

    const left = leftShapeRef.current;
    const right = rightShapeRef.current;
    const leftW = biggerSide === "left" ? BASE_SIZE + SIZE_DIFF : BASE_SIZE;
    const rightW = biggerSide === "right" ? BASE_SIZE + SIZE_DIFF : BASE_SIZE;

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
      const introAttempt = attemptIndex ?? sequenceIndex;
      if (shouldSkipIntroCard(introAttempt)) {
        onIntroCompleteRef.current();
        setPhase("playing");
      } else {
        setPhase("intro");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [shellReady, gameKey, sequenceIndex, attemptIndex]);

  useLayoutEffect(() => {
    if (phase !== "playing") return;
    layoutScattered();
    prepareGameContentHidden({
      desc: descBoxRef.current,
      board: boardRef.current,
    });
  }, [phase, biggerSide, layoutScattered, gameKey]);

  useEffect(() => {
    if (phase !== "playing") return;

    const tl = runGameContentReveal(
      { desc: descBoxRef.current, board: boardRef.current },
      () => onGameStartRef.current(),
    );

    window.addEventListener("resize", layoutScattered);
    return () => {
      tl.kill();
      window.removeEventListener("resize", layoutScattered);
    };
  }, [phase, gameKey, layoutScattered]);

  const introActive = introPendingPhase(phase);

  return (
    <div
      className="absolute inset-0 overflow-hidden select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <GameIntroOverlay
        ref={introCardRef}
        gameId="retina-check"
        description="Pick the shape that's 2px bigger and prove your eyes are unnecessarily calibrated for absolutely no reason."
        playEnabled={introPlayEnabled}
        playPressed={introPlayPressed}
        onPlay={handleIntroPlay}
      />

      <GameDescBox
        ref={descBoxRef}
        gameId="retina-check"
        style={
          introActive
            ? { visibility: "hidden", pointerEvents: "none" }
            : undefined
        }
      >
        Pick the shape that&apos;s 2px bigger and prove your eyes are
        unnecessarily calibrated for absolutely no reason.
      </GameDescBox>

      <div
        ref={boardRef}
        className="absolute inset-0 z-[1] overflow-hidden"
        style={
          introActive
            ? { visibility: "hidden", pointerEvents: "none" }
            : undefined
        }
      >
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
              style={{
                ...leftShapeStyle,
                ...(gsapControlsSize
                  ? { willChange: "width, height, transform" as const }
                  : null),
              }}
              aria-label={`Sol ${shapeLabel} — 2 piksel daha büyük olanı seç`}
            />
            <button
              ref={rightShapeRef}
              type="button"
              disabled={phase !== "playing" || isZoomed}
              onClick={() => handlePick("right")}
              className="absolute left-0 top-0 cursor-pointer outline-none disabled:cursor-default"
              style={{
                ...rightShapeStyle,
                ...(gsapControlsSize
                  ? { willChange: "width, height, transform" as const }
                  : null),
              }}
              aria-label={`Sağ ${shapeLabel} — 2 piksel daha büyük olanı seç`}
            />
            {showTriangleGuides && (
              <>
                <span
                  ref={leftGuideRef}
                  aria-hidden
                  className="pointer-events-none absolute z-10"
                  style={{
                    height: 1,
                    backgroundColor: REVEAL_GUIDE_COLOR,
                    opacity: 0,
                  }}
                />
                <span
                  ref={rightGuideRef}
                  aria-hidden
                  className="pointer-events-none absolute z-10"
                  style={{
                    height: 1,
                    backgroundColor: REVEAL_GUIDE_COLOR,
                    opacity: 0,
                  }}
                />
              </>
            )}
          </div>
        )}
      </div>

      {isZoomed && phase === "playing" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center px-4">
          <p
            className="retina-cheat-wobble pointer-events-none text-center uppercase text-[#1A1A1A] select-none"
            style={{
              fontFamily: "var(--font-planc), serif",
              fontWeight: 800,
              fontSize: "clamp(52px, 11vw, 90px)",
              lineHeight: 0.92,
              letterSpacing: "-0.03em",
            }}
          >
            NO ZOOM, NO CHEAT!!1!
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
