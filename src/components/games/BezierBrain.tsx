"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { GameDescBox } from "@/components/GameDescBox";
import DoneKeycap from "@/components/DoneKeycap";
import ScoreSideReveal from "@/components/games/ScoreSideReveal";

interface BezierBrainProps {
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

type Phase = "waiting" | "intro" | "playing" | "ended";

type Rail = "outer" | "inner";

interface PointDef {
  x: number;
  y: number;
  fixed: boolean;
  rail: Rail;
}

interface GamePoint {
  correctX: number;
  correctY: number;
  correctT: number;
  currentT: number;
  currentX: number;
  currentY: number;
  fixed: boolean;
  rail: Rail;
}

const S_PATH =
  "M267.877 354L188.737 334.65C78.8169 306.51 23.4169 255.51 23.4169 166.69C23.4169 77.87 106.947 0.5 230.057 0.5C341.737 0.5 438.467 59.42 449.017 180.77H370.757C364.597 106.02 308.317 67.33 230.057 67.33C137.727 67.33 99.0269 116.57 99.0269 165.82C99.0269 219.46 133.327 248.48 213.347 267.83L295.127 287.18C408.567 315.32 467.487 370.72 467.487 458.66C467.487 558.91 377.787 638.93 242.367 638.93C99.9069 638.93 9.33687 557.15 0.536865 433.16H77.0469C87.5969 526.37 154.427 572.1 242.367 572.1C325.027 572.1 391.857 531.65 391.857 464.82C391.857 403.27 354.927 375.13 267.867 354.02L267.877 354Z";

const VB_PAD = 14;
const VIEWBOX = `${-VB_PAD} ${-VB_PAD} ${468 + VB_PAD * 2} ${640 + VB_PAD * 2}`;
/** S.svg game letter vs Sfinal.svg reference points — different viewBox sizes */
const GAME_VB = { w: 468, h: 640 };
const SFINAL_VB = { w: 226, h: 305 };

/** Positions from public/letters/Sfinal.svg (scaled to game viewBox) */
const SFINAL_POINTS: PointDef[] = [
  // 4 gray fixed terminals — path cap corners from Sfinal main path
  { x: 212.402, y: 87.9418, fixed: true, rail: "outer" },
  { x: 176.231, y: 87.9418, fixed: true, rail: "inner" },
  { x: 5.11719, y: 204.595, fixed: true, rail: "outer" },
  { x: 40.4797, y: 204.595, fixed: true, rail: "inner" },
  // 12 black moveable break points
  { x: 111.2, y: 4.622, fixed: false, rail: "inner" },
  { x: 111.2, y: 35.511, fixed: false, rail: "inner" },
  { x: 15.687, y: 81.439, fixed: false, rail: "inner" },
  { x: 50.643, y: 81.032, fixed: false, rail: "inner" },
  { x: 103.481, y: 128.181, fixed: false, rail: "inner" },
  { x: 141.279, y: 137.119, fixed: false, rail: "outer" },
  { x: 92.098, y: 159.069, fixed: false, rail: "inner" },
  { x: 128.681, y: 168.008, fixed: false, rail: "outer" },
  { x: 116.894, y: 268.807, fixed: false, rail: "inner" },
  { x: 110.936, y: 299.696, fixed: false, rail: "inner" },
  { x: 185.987, y: 219.219, fixed: false, rail: "outer" },
  { x: 220.938, y: 216.377, fixed: false, rail: "outer" },
];

const DESC_COPY = {
  title: "Bezier Brain",
  body: "Move each anchor point to its correct position on the path then press done and let's see how type nerd you really are.",
};

const INTRO_HOLD = 2;
const DOT_RADIUS = 7;
const GHOST_FADE_DURATION = 0.55;
const SNAP_START_DELAY = 0.6;
const SNAP_DURATION = 1.35;
const SNAP_STAGGER = 0.07;
const REVEAL_HOLD = 1.5;
const SHRINK_DURATION = 0.9;
const SHRINK_TARGET = 0.36;
const VANISH_AT_SCALE = 0.42;
const T_GAP = 0.008;
const HINT_WINDOW = 0.14;

function scalePoint(p: PointDef): PointDef {
  return {
    x: (p.x / SFINAL_VB.w) * GAME_VB.w,
    y: (p.y / SFINAL_VB.h) * GAME_VB.h,
    fixed: p.fixed,
    rail: p.rail,
  };
}

function projectToPath(
  path: SVGPathElement,
  total: number,
  x: number,
  y: number,
  minT = 0,
  maxT = 1,
  hintT?: number,
): number {
  let bestT = hintT ?? (minT + maxT) / 2;
  let minDist = Infinity;

  const searchMin = hintT !== undefined ? Math.max(minT, hintT - HINT_WINDOW) : minT;
  const searchMax = hintT !== undefined ? Math.min(maxT, hintT + HINT_WINDOW) : maxT;

  const steps = 120;
  for (let i = 0; i <= steps; i += 1) {
    const t = searchMin + (i / steps) * (searchMax - searchMin);
    const pt = path.getPointAtLength(t * total);
    const dist = (pt.x - x) ** 2 + (pt.y - y) ** 2;
    if (dist < minDist) {
      minDist = dist;
      bestT = t;
    }
  }

  const refineStart = Math.max(searchMin, bestT - 0.03);
  const refineEnd = Math.min(searchMax, bestT + 0.03);
  for (let t = refineStart; t <= refineEnd; t += 0.001) {
    const pt = path.getPointAtLength(t * total);
    const dist = (pt.x - x) ** 2 + (pt.y - y) ** 2;
    if (dist < minDist) {
      minDist = dist;
      bestT = t;
    }
  }

  return Math.max(minT, Math.min(maxT, bestT));
}

function applyCurrentPos(
  path: SVGPathElement,
  total: number,
  point: GamePoint,
  t = point.currentT,
): GamePoint {
  if (point.fixed) {
    return {
      ...point,
      currentT: t,
      currentX: point.correctX,
      currentY: point.correctY,
    };
  }

  const pt = posFromT(path, total, t);
  return {
    ...point,
    currentT: t,
    currentX: pt.x,
    currentY: pt.y,
  };
}

function syncPointsPositions(
  path: SVGPathElement,
  total: number,
  list: GamePoint[],
): GamePoint[] {
  return list.map((p) => applyCurrentPos(path, total, p));
}

function buildGamePoints(path: SVGPathElement, total: number): GamePoint[] {
  return SFINAL_POINTS.map((def) => {
    const scaled = scalePoint(def);
    const correctT = projectToPath(path, total, scaled.x, scaled.y);

    if (def.fixed) {
      return {
        correctX: scaled.x,
        correctY: scaled.y,
        correctT,
        currentT: correctT,
        currentX: scaled.x,
        currentY: scaled.y,
        fixed: true,
        rail: def.rail,
      };
    }

    const pt = path.getPointAtLength(correctT * total);
    return {
      correctX: pt.x,
      correctY: pt.y,
      correctT,
      currentT: correctT,
      currentX: pt.x,
      currentY: pt.y,
      fixed: false,
      rail: def.rail,
    };
  });
}

function getPathBounds(points: GamePoint[], index: number) {
  const rail = points[index]!.rail;
  const order = points
    .map((_, i) => i)
    .filter((i) => points[i]!.rail === rail)
    .sort((a, b) => points[a]!.correctT - points[b]!.correctT);

  const pos = order.indexOf(index);
  const prev = pos > 0 ? points[order[pos - 1]!]! : null;
  const next = pos < order.length - 1 ? points[order[pos + 1]!]! : null;

  const minT = prev
    ? (prev.fixed ? prev.correctT : prev.currentT) + T_GAP
    : 0;
  const maxT = next
    ? (next.fixed ? next.correctT : next.currentT) - T_GAP
    : 1;

  return { minT, maxT };
}

function displaceT(
  correctT: number,
  minT: number,
  maxT: number,
): number {
  const direction = Math.random() > 0.5 ? 1 : -1;
  const amount = 0.025 + Math.random() * 0.045;
  const displaced = correctT + direction * amount;
  return Math.max(minT + T_GAP, Math.min(maxT - T_GAP, displaced));
}

function buildRoundPoints(base: GamePoint[]): {
  introStart: GamePoint[];
  scatterTargets: GamePoint[];
} {
  const scatterTargets = base.map((p, i) => {
    if (p.fixed) return { ...p };
    const { minT, maxT } = getPathBounds(base, i);
    return { ...p, currentT: displaceT(p.correctT, minT, maxT) };
  });

  const introStart = scatterTargets.map((p) =>
    p.fixed ? { ...p } : { ...p, currentT: p.correctT },
  );

  return { introStart, scatterTargets };
}

function calculateScore(points: GamePoint[]): number {
  const moveable = points.filter((p) => !p.fixed);
  if (moveable.length === 0) return 0;

  const totalError = moveable.reduce(
    (sum, p) => sum + Math.abs(p.currentT - p.correctT),
    0,
  );
  const avgError = totalError / moveable.length;
  return Math.max(0, Math.round(100 - (avgError / 0.12) * 100));
}

function posFromT(
  path: SVGPathElement,
  total: number,
  t: number,
): { x: number; y: number } {
  const pt = path.getPointAtLength(Math.max(0, Math.min(1, t)) * total);
  return { x: pt.x, y: pt.y };
}

export default function BezierBrain({
  gameKey,
  isPlaying,
  shellReady,
  onAnswer,
  onGameStart,
  addRoundScore,
  onGameComplete,
  timeLeft,
}: BezierBrainProps) {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [points, setPoints] = useState<GamePoint[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [pointsOpacity, setPointsOpacity] = useState(0);
  const [ghostOpacity, setGhostOpacity] = useState(0);
  const [flyScore, setFlyScore] = useState<number | null>(null);
  const [pathReady, setPathReady] = useState(false);

  const pointsRef = useRef<GamePoint[]>([]);
  const scatterTargetsRef = useRef<GamePoint[]>([]);
  const dragIndexRef = useRef<number | null>(null);
  const captureTargetRef = useRef<Element | null>(null);
  const endedRef = useRef(false);
  const canDragRef = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const letterRef = useRef<SVGGElement>(null);
  const letterWrapRef = useRef<HTMLDivElement>(null);
  const scoreAnchorRef = useRef<HTMLDivElement>(null);
  const finishTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const totalLengthRef = useRef(0);
  const pendingResultRef = useRef<{ score: number; correct: boolean } | null>(
    null,
  );
  const exitStartedRef = useRef(false);
  const letterExitDoneRef = useRef(false);
  const scoreFlyDoneRef = useRef(false);
  const introCardRef = useRef<HTMLDivElement>(null);
  const descBoxRef = useRef<HTMLDivElement>(null);
  const onGameStartRef = useRef(onGameStart);

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  useEffect(() => {
    dragIndexRef.current = dragIndex;
  }, [dragIndex]);

  useEffect(() => {
    onGameStartRef.current = onGameStart;
  });

  useLayoutEffect(() => {
    const path = pathRef.current;
    if (!path) return;

    const total = path.getTotalLength();
    totalLengthRef.current = total;

    const base = buildGamePoints(path, total);
    const { introStart, scatterTargets } = buildRoundPoints(base);
    const syncedIntro = syncPointsPositions(path, total, introStart);
    const syncedScatter = syncPointsPositions(path, total, scatterTargets);

    scatterTargetsRef.current = syncedScatter;
    pointsRef.current = syncedIntro;
    setPoints(syncedIntro);
    setPathReady(true);

    if (letterWrapRef.current) {
      gsap.set(letterWrapRef.current, { scale: 1, opacity: 1 });
    }
  }, [shellReady, gameKey]);

  const completeRound = useCallback(() => {
    const result = pendingResultRef.current;
    if (!result) return;
    pendingResultRef.current = null;
    onAnswer(result.correct);
    onGameComplete?.();
  }, [onAnswer, onGameComplete]);

  const tryCompleteRound = useCallback(() => {
    if (!letterExitDoneRef.current || !scoreFlyDoneRef.current) return;
    completeRound();
  }, [completeRound]);

  const runLetterExit = useCallback(() => {
    if (exitStartedRef.current) return;
    exitStartedRef.current = true;

    const wrap = letterWrapRef.current;
    if (!wrap) {
      letterExitDoneRef.current = true;
      tryCompleteRound();
      return;
    }

    gsap.to(wrap, {
      scale: SHRINK_TARGET,
      duration: SHRINK_DURATION,
      ease: "power2.in",
      transformOrigin: "50% 50%",
      onUpdate: () => {
        const scale = gsap.getProperty(wrap, "scaleX") as number;
        if (scale <= VANISH_AT_SCALE) {
          gsap.set(wrap, { opacity: 0 });
        }
      },
      onComplete: () => {
        letterExitDoneRef.current = true;
        tryCompleteRound();
      },
    });
  }, [tryCompleteRound]);

  const handleScoreLand = useCallback(
    (points: number) => {
      addRoundScore(points);
    },
    [addRoundScore],
  );

  const handleScoreFlyComplete = useCallback(() => {
    setFlyScore(null);
    scoreFlyDoneRef.current = true;
    tryCompleteRound();
  }, [tryCompleteRound]);

  const finishGame = useCallback(() => {
    if (endedRef.current || phase !== "playing") return;
    endedRef.current = true;
    canDragRef.current = false;
    setPhase("ended");
    setDragIndex(null);
    dragIndexRef.current = null;
    setGhostOpacity(0);

    finishTimelineRef.current?.kill();

    const live = pointsRef.current.map((p) => ({ ...p }));
    const score100 = calculateScore(live);
    const moveable = live.filter((p) => !p.fixed);
    const avgError =
      moveable.reduce(
        (sum, p) => sum + Math.abs(p.currentT - p.correctT),
        0,
      ) / Math.max(1, moveable.length);

    pendingResultRef.current = {
      score: score100 * 10,
      correct: avgError < 0.03,
    };

    const moveableIndices = live
      .map((p, i) => (!p.fixed ? i : -1))
      .filter((i) => i >= 0);

    const startSnap = () => {
      if (moveableIndices.length === 0) {
        gsap.delayedCall(REVEAL_HOLD, () => {
          setFlyScore(score100 * 10);
        });
        return;
      }

      let snapCompleted = 0;
      const onAllSnapped = () => {
        gsap.delayedCall(REVEAL_HOLD, () => {
          setFlyScore(score100 * 10);
        });
      };

      moveableIndices.forEach((index, order) => {
        const p = live[index]!;
        gsap.to(p, {
          currentT: p.correctT,
          duration: SNAP_DURATION,
          ease: "power2.out",
          delay: order * SNAP_STAGGER,
          onUpdate: () => {
            const path = pathRef.current;
            const total = totalLengthRef.current;
            if (!path || total === 0) return;

            setPoints((prev) => {
              const next = prev.map((pt, idx) =>
                idx === index
                  ? applyCurrentPos(path, total, pt, p.currentT)
                  : pt,
              );
              pointsRef.current = next;
              return next;
            });
          },
          onComplete: () => {
            snapCompleted += 1;
            if (snapCompleted === moveableIndices.length) onAllSnapped();
          },
        });
      });
    };

    const ghostProxy = { opacity: 0 };
    const tl = gsap.timeline();
    finishTimelineRef.current = tl;

    tl.to(ghostProxy, {
      opacity: 0.85,
      duration: GHOST_FADE_DURATION,
      ease: "power2.out",
      onUpdate: () => setGhostOpacity(ghostProxy.opacity),
    });

    tl.call(startSnap, undefined, SNAP_START_DELAY);
  }, [phase]);

  useEffect(() => {
    if (!shellReady || !pathReady) return;

    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      endedRef.current = false;
      exitStartedRef.current = false;
      letterExitDoneRef.current = false;
      scoreFlyDoneRef.current = false;
      pendingResultRef.current = null;
      canDragRef.current = false;
      finishTimelineRef.current?.kill();
      setFlyScore(null);
      setGhostOpacity(0);
      setPhase("intro");
      setPointsOpacity(0);
      setDragIndex(null);
    });

    return () => {
      cancelled = true;
    };
  }, [shellReady, gameKey, pathReady]);

  useEffect(() => {
    if (!shellReady || !pathReady || phase !== "intro") return;

    const card = introCardRef.current;
    const descBox = descBoxRef.current;
    const letter = letterRef.current;

    const tl = gsap.timeline();
    const opacityProxy = { value: 0 };

    if (descBox) {
      gsap.set(descBox, { opacity: 0, x: -12 });
      tl.to(descBox, { opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }, 0);
    }

    if (letter) {
      gsap.set(letter, { opacity: 0 });
      tl.to(letter, { opacity: 1, duration: 0.6, ease: "power2.out" }, 0.15);
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

    tl.to(opacityProxy, {
      value: 1,
      duration: 0.4,
      ease: "power2.out",
      onUpdate: () => setPointsOpacity(opacityProxy.value),
    });

    tl.call(() => {
      const live = pointsRef.current.map((p) => ({ ...p }));
      const targets = scatterTargetsRef.current;
      const moveableIndices = live
        .map((p, i) => (!p.fixed ? i : -1))
        .filter((i) => i >= 0);

      let completed = 0;
      const onScatterDone = () => {
        completed += 1;
        if (completed === moveableIndices.length) {
          canDragRef.current = true;
          setPhase("playing");
          onGameStartRef.current();
        }
      };

      moveableIndices.forEach((index, order) => {
        const p = live[index]!;
        const target = targets[index]!;
        gsap.to(p, {
          currentT: target.currentT,
          duration: 0.6,
          ease: "power2.inOut",
          delay: order * 0.04,
          onUpdate: () => {
            const path = pathRef.current;
            const total = totalLengthRef.current;
            if (!path || total === 0) return;

            const next = live.map((pt, idx) =>
              idx === index
                ? applyCurrentPos(path, total, pt, p.currentT)
                : pt,
            );
            pointsRef.current = next;
            setPoints(next);
          },
          onComplete: onScatterDone,
        });
      });

      if (moveableIndices.length === 0) {
        canDragRef.current = true;
        setPhase("playing");
        onGameStartRef.current();
      }
    });

    return () => {
      tl.kill();
    };
  }, [shellReady, gameKey, pathReady, phase]);

  useEffect(() => {
    if (phase !== "playing" || !isPlaying || timeLeft > 0) return;
    finishGame();
  }, [phase, isPlaying, timeLeft, finishGame]);

  const pointerToSVG = useCallback(
    (e: React.PointerEvent | PointerEvent) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: e.clientX, y: e.clientY };
      const svgPt = pt.matrixTransform(ctm.inverse());
      return { x: svgPt.x, y: svgPt.y };
    },
    [],
  );

  const handlePointerDown = useCallback(
    (index: number, e: React.PointerEvent) => {
      if (phase !== "playing" || !canDragRef.current || endedRef.current) return;
      const point = pointsRef.current[index];
      if (!point || point.fixed) return;

      e.preventDefault();
      e.stopPropagation();
      captureTargetRef.current = e.currentTarget as Element;
      captureTargetRef.current.setPointerCapture(e.pointerId);
      dragIndexRef.current = index;
      setDragIndex(index);
    },
    [phase],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const index = dragIndexRef.current;
      if (index === null) return;

      e.preventDefault();
      const point = pointsRef.current[index];
      const path = pathRef.current;
      const total = totalLengthRef.current;
      if (!point || point.fixed || !path || total === 0) return;

      const svgPos = pointerToSVG(e);
      const { minT, maxT } = getPathBounds(pointsRef.current, index);
      const newT = projectToPath(
        path,
        total,
        svgPos.x,
        svgPos.y,
        minT,
        maxT,
        point.currentT,
      );

      setPoints((prev) => {
        const path = pathRef.current;
        const total = totalLengthRef.current;
        if (!path || total === 0) return prev;

        const next = prev.map((p, i) =>
          i === index ? applyCurrentPos(path, total, p, newT) : p,
        );
        pointsRef.current = next;
        return next;
      });
    },
    [pointerToSVG],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragIndexRef.current === null) return;

    const target = captureTargetRef.current;
    try {
      if (target?.hasPointerCapture?.(e.pointerId)) {
        target.releasePointerCapture(e.pointerId);
      }
    } catch {
      // pointer may already be released
    }

    captureTargetRef.current = null;
    dragIndexRef.current = null;
    setDragIndex(null);
  }, []);

  const handleDone = useCallback(() => {
    finishGame();
  }, [finishGame]);

  return (
    <div
      className="absolute inset-0 overflow-hidden select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        ref={introCardRef}
        className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
        style={{ opacity: 0 }}
      >
        <div
          className="flex flex-col items-center rounded-[40px] bg-white/95 px-12 py-8 text-center shadow-lg backdrop-blur-sm"
          style={{ maxWidth: "520px" }}
        >
          <h2
            className="mb-3 font-bold text-[#1A1A1A]"
            style={{
              fontSize: "clamp(28px, 5vw, 42px)",
              fontFamily: "var(--font-planc), serif",
            }}
          >
            BEZIER BRAIN
          </h2>
          <p
            className="max-w-[420px] text-[14px] leading-relaxed text-[#555]"
            style={{ fontFamily: "var(--font-planc), serif" }}
          >
            {DESC_COPY.body}
          </p>
        </div>
      </div>

      <GameDescBox ref={descBoxRef} title={DESC_COPY.title}>
        {DESC_COPY.body}
      </GameDescBox>

      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            ref={letterWrapRef}
            style={{
              position: "relative",
              height: "70%",
              maxHeight: "70vh",
              transformOrigin: "50% 50%",
              overflow: "visible",
            }}
          >
            <div
              ref={scoreAnchorRef}
              className="pointer-events-none absolute"
              style={{
                left: "100%",
                top: "42%",
                width: 1,
                height: 1,
                marginLeft: 108,
                transform: "translateY(-50%)",
              }}
            />

            <svg
              ref={svgRef}
              viewBox={VIEWBOX}
              preserveAspectRatio="xMidYMid meet"
              className="h-full w-auto touch-none"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ touchAction: "none", display: "block", overflow: "visible" }}
              aria-label="Letter S outline"
            >
              <g ref={letterRef} style={{ opacity: phase === "waiting" ? 0 : 1 }}>
                <path
                  ref={pathRef}
                  d={S_PATH}
                  fill="none"
                  stroke="#1A1A1A"
                  strokeWidth={1.5}
                  strokeMiterlimit={10}
                />

                {pathReady && points.length > 0 && (
                  <g style={{ opacity: pointsOpacity }}>
                    {phase === "ended" &&
                      points
                        .filter((p) => !p.fixed)
                        .map((point, i) => (
                            <circle
                              key={`ghost-${i}`}
                              cx={point.correctX}
                              cy={point.correctY}
                              r={DOT_RADIUS}
                              fill="#C8C8C8"
                              stroke="#999999"
                              strokeWidth={1.5}
                              opacity={ghostOpacity}
                              pointerEvents="none"
                            />
                          ))}

                    {points.map((point, i) => {
                      if (point.fixed) {
                        return (
                          <circle
                            key={`dot-${i}`}
                            cx={point.correctX}
                            cy={point.correctY}
                            r={DOT_RADIUS}
                            fill="#C8C8C8"
                            stroke="#888888"
                            strokeWidth={1.5}
                            pointerEvents="none"
                          />
                        );
                      }

                      const isInteractive = phase === "playing";

                      return (
                        <circle
                          key={`dot-${i}`}
                          cx={point.currentX}
                          cy={point.currentY}
                          r={DOT_RADIUS}
                          fill="#1A1A1A"
                          stroke="#1A1A1A"
                          strokeWidth={1.5}
                          pointerEvents={isInteractive ? "auto" : "none"}
                          style={{
                            cursor: isInteractive
                              ? dragIndex === i
                                ? "grabbing"
                                : "grab"
                              : undefined,
                            touchAction: "none",
                          }}
                          onPointerDown={
                            isInteractive
                              ? (e) => handlePointerDown(i, e)
                              : undefined
                          }
                        />
                      );
                    })}
                  </g>
                )}
              </g>
            </svg>
          </div>
        </div>

        {phase === "playing" && (
          <div
            className="absolute left-1/2 z-20 -translate-x-1/2"
            style={{ bottom: "3%" }}
          >
            <DoneKeycap onPress={handleDone} />
          </div>
        )}

        {flyScore !== null && (
          <ScoreSideReveal
            key={flyScore}
            points={flyScore}
            anchorRef={scoreAnchorRef}
            onFlyStart={runLetterExit}
            onScoreLand={() => handleScoreLand(flyScore)}
            onComplete={handleScoreFlyComplete}
          />
        )}
      </div>
    </div>
  );
}
