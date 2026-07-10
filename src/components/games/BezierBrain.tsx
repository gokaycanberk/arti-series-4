"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { GameDescBox } from "@/components/GameDescBox";
import { GameIntroOverlay } from "@/components/GameIntroOverlay";
import DoneKeycap from "@/components/DoneKeycap";
import ScoreSideReveal from "@/components/games/ScoreSideReveal";
import {
  GAME_REVEAL_STAGGER,
  introPendingPhase,
  prepareGameContentHidden,
  runGameContentReveal,
  shouldSkipIntroCard,
} from "@/lib/gameIntro";
import { useGameIntroPlay } from "@/lib/useGameIntroPlay";
import {
  getBezierCharacter,
  type BezierCharacter,
  type BezierPointDef,
  type BezierRail as Rail,
} from "@/lib/bezierBrainVariations";

interface BezierBrainProps {
  gameKey: string;
  /** Karakter seçimi: 0=S, 1=2, … */
  sequenceIndex?: number;
  /** Intro kartı — yalnızca ilk etap (0). Varsayılan: sequenceIndex */
  attemptIndex?: number;
  isPlaying: boolean;
  shellReady: boolean;
  onAnswer: (correct: boolean) => void;
  onGameStart: () => void;
  onIntroComplete: () => void;
  addRoundScore: (points: number) => void;
  onGameComplete?: () => void;
  round: number;
  timeLeft: number;
}

type Phase = "waiting" | "intro" | "playing" | "ended";

type PointDef = BezierPointDef;

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

const DESC_COPY = {
  body: "Move each anchor point to its correct position on the path then press done and let's see how type nerd you really are.",
};

const DOT_RADIUS = 7;
const GHOST_FADE_DURATION = 1.4;
const SNAP_START_DELAY = 0.6;
const SNAP_DURATION = 2.4;
const SNAP_STAGGER = 0.1;
const REVEAL_HOLD = 0.4;
/** Done tuşu — bırakma animasyonu + fade */
const DONE_RELEASE_HOLD = 0.22;
const DONE_EXIT_DURATION = 0.28;
const SHRINK_DURATION = 0.9;
const SHRINK_TARGET = 0.36;
const VANISH_AT_SCALE = 0.42;
const T_GAP = 0.008;
const HINT_WINDOW = 0.14;
/** Sürükleme: mevcut konum etrafındaki arama penceresi (logical t birimi) */
const DRAG_WINDOW = 0.05;

/* ────────── Path geometry: contour tespiti + dikiş döndürme ────────── */

interface Contour {
  /** logical t aralığı */
  start: number;
  end: number;
  /** contour içi parametre döndürme (0-1) — dikişi boş bölgeye taşır */
  offset: number;
}

interface PathGeometry {
  contours: Contour[];
  /** logical t → fiziksel arc fraction */
  frac: (t: number) => number;
}

const IDENTITY_FRAC = (t: number) => t;

/** Alt-yol (subpath) sınırlarını arc-length sıçramalarından bul */
function detectContours(
  path: SVGPathElement,
  total: number,
): { start: number; end: number }[] {
  if (total === 0) return [{ start: 0, end: 1 }];
  const steps = 2000;
  const stepLen = total / steps;
  const jumpThreshold = Math.max(8, stepLen * 8);

  const boundaries: number[] = [0];
  let prev = path.getPointAtLength(0);
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const pt = path.getPointAtLength(t * total);
    const d = Math.hypot(pt.x - prev.x, pt.y - prev.y);
    if (d > jumpThreshold) boundaries.push(t);
    prev = pt;
  }
  boundaries.push(1);

  const ranges: { start: number; end: number }[] = [];
  for (let i = 0; i < boundaries.length - 1; i += 1) {
    const start = boundaries[i]!;
    const end = boundaries[i + 1]!;
    if (end - start > 0.01) ranges.push({ start, end });
  }
  return ranges.length ? ranges : [{ start: 0, end: 1 }];
}

function makeFrac(contours: Contour[]): (t: number) => number {
  return (t: number) => {
    const tc = Math.max(0, Math.min(1, t));
    let c = contours[0]!;
    for (const cand of contours) {
      if (tc >= cand.start && tc < cand.end) {
        c = cand;
        break;
      }
      if (tc >= cand.end) c = cand;
    }
    const span = c.end - c.start;
    if (span <= 0) return c.start;
    const local = (tc - c.start) / span;
    const rotated = (((local + c.offset) % 1) + 1) % 1;
    return c.start + rotated * span;
  };
}

function contourOfT(contours: Contour[], t: number): Contour {
  const tc = Math.max(0, Math.min(1, t));
  for (const c of contours) {
    if (tc >= c.start && tc < c.end) return c;
  }
  return contours[contours.length - 1]!;
}

/**
 * Bir noktanın izinli logical-t aralığı — contour içinde path sırasına göre
 * iki fiziksel komşusu (ray'dan bağımsız, fixed dahil) arasında. Wrap YOK:
 * dikiş büyük boşluğa taşındığından uçlar zaten boş bölgeye bakar.
 */
function getContourBounds(
  points: GamePoint[],
  index: number,
  contours: Contour[],
): { minT: number; maxT: number } {
  const self = points[index]!;
  const contour = contourOfT(contours, self.correctT);

  const group = points
    .map((_, i) => i)
    .filter((i) => contourOfT(contours, points[i]!.correctT) === contour)
    .sort((a, b) => points[a]!.correctT - points[b]!.correctT);

  const pos = group.indexOf(index);
  const prev = pos > 0 ? points[group[pos - 1]!]! : null;
  const next = pos < group.length - 1 ? points[group[pos + 1]!]! : null;

  const minT = prev
    ? (prev.fixed ? prev.correctT : prev.currentT) + T_GAP
    : contour.start;
  const maxT = next
    ? (next.fixed ? next.correctT : next.currentT) - T_GAP
    : contour.end;

  return { minT: Math.min(minT, maxT), maxT: Math.max(minT, maxT) };
}

function scalePoint(p: PointDef, char: BezierCharacter): PointDef {
  return {
    x: (p.x / char.pointsViewBox.w) * char.gameViewBox.w,
    y: (p.y / char.pointsViewBox.h) * char.gameViewBox.h,
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
  frac: (t: number) => number = IDENTITY_FRAC,
  windowSize = HINT_WINDOW,
): number {
  let bestT = hintT ?? (minT + maxT) / 2;
  let minDist = Infinity;

  const searchMin = hintT !== undefined ? Math.max(minT, hintT - windowSize) : minT;
  const searchMax = hintT !== undefined ? Math.min(maxT, hintT + windowSize) : maxT;

  const steps = 120;
  for (let i = 0; i <= steps; i += 1) {
    const t = searchMin + (i / steps) * (searchMax - searchMin);
    const pt = path.getPointAtLength(frac(t) * total);
    const dist = (pt.x - x) ** 2 + (pt.y - y) ** 2;
    if (dist < minDist) {
      minDist = dist;
      bestT = t;
    }
  }

  const refineStart = Math.max(searchMin, bestT - 0.03);
  const refineEnd = Math.min(searchMax, bestT + 0.03);
  for (let t = refineStart; t <= refineEnd; t += 0.001) {
    const pt = path.getPointAtLength(frac(t) * total);
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
  frac: (t: number) => number = IDENTITY_FRAC,
): GamePoint {
  if (point.fixed) {
    return {
      ...point,
      currentT: t,
      currentX: point.correctX,
      currentY: point.correctY,
    };
  }

  const pt = posFromT(path, total, t, frac);
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
  frac: (t: number) => number = IDENTITY_FRAC,
): GamePoint[] {
  return list.map((p) => applyCurrentPos(path, total, p, p.currentT, frac));
}

/**
 * Contour geometrisi kur ve her contour'un dikişini (logical t sınırı) o
 * contour'daki noktaların EN BÜYÜK boşluğunun ortasına taşı. Böylece hiçbir
 * nokta dikişte sıkışmaz (ör. "2" tepe noktası) ve sınırlar boş bölgeye bakar.
 */
function buildGeometry(
  path: SVGPathElement,
  total: number,
  char: BezierCharacter,
): PathGeometry {
  const rawContours = detectContours(path, total);
  const baseContours: Contour[] = rawContours.map((c) => ({
    start: c.start,
    end: c.end,
    offset: 0,
  }));

  const defs: PointDef[] = [...char.fixedCorners, ...char.movablePoints];
  // Offset'siz fiziksel konumları bul (identity contour üzerinde)
  const physFrac = makeFrac(baseContours);
  const physT = defs.map((def) => {
    const scaled = def.fixed ? def : scalePoint(def, char);
    return projectToPath(path, total, scaled.x, scaled.y, 0, 1, undefined, physFrac);
  });

  const contours: Contour[] = baseContours.map((c) => {
    const span = c.end - c.start;
    if (span <= 0) return c;
    const locals = physT
      .filter((t) => t >= c.start && t < c.end)
      .map((t) => (t - c.start) / span)
      .sort((a, b) => a - b);

    if (locals.length === 0) return c;

    // En büyük dairesel boşluğun ortası → dikiş oraya
    let bestMid = 0;
    let bestGap = -1;
    for (let i = 0; i < locals.length; i += 1) {
      const a = locals[i]!;
      const b = i + 1 < locals.length ? locals[i + 1]! : locals[0]! + 1;
      const gap = b - a;
      if (gap > bestGap) {
        bestGap = gap;
        bestMid = (a + b) / 2;
      }
    }
    // frac: physicalLocal = (logicalLocal + offset) mod 1; seam(logical 0) → bestMid
    return { start: c.start, end: c.end, offset: ((bestMid % 1) + 1) % 1 };
  });

  return { contours, frac: makeFrac(contours) };
}

function buildGamePoints(
  path: SVGPathElement,
  total: number,
  char: BezierCharacter,
  geometry: PathGeometry,
): GamePoint[] {
  const { frac } = geometry;
  const defs: PointDef[] = [...char.fixedCorners, ...char.movablePoints];
  return defs.map((def) => {
    const scaled = def.fixed ? def : scalePoint(def, char);
    const correctT = projectToPath(
      path,
      total,
      scaled.x,
      scaled.y,
      0,
      1,
      undefined,
      frac,
    );

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

    const pt = path.getPointAtLength(frac(correctT) * total);
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

/**
 * Yarım-boşluk kuralıyla kaydır: her nokta komşusuna olan boşluğun EN FAZLA
 * yarısı kadar ilerler → hiçbir nokta komşusunun üstünden geçemez, sıra korunur.
 */
function displaceInBounds(
  correctT: number,
  minT: number,
  maxT: number,
): number {
  const lowRoom = (correctT - minT) * 0.5;
  const highRoom = (maxT - correctT) * 0.5;
  const canLow = lowRoom > 0.004;
  const canHigh = highRoom > 0.004;

  let direction: 1 | -1;
  if (canLow && canHigh) direction = Math.random() > 0.5 ? 1 : -1;
  else if (canHigh) direction = 1;
  else if (canLow) direction = -1;
  else return correctT;

  const room = direction > 0 ? highRoom : lowRoom;
  const frac = 0.55 + Math.random() * 0.4;
  const amount = Math.min(room, Math.max(room * 0.5, room * frac));
  return correctT + direction * amount;
}

/**
 * Round noktalarını dağıt. Karşılıklı çiftlerden birini (path sırasına göre
 * her contour'da bir atlamalı) doğru yerinde bırak — ipucu olsun.
 */
function buildRoundPoints(
  base: GamePoint[],
  contours: Contour[],
): GamePoint[] {
  const result = base.map((p) => ({ ...p }));

  contours.forEach((contour) => {
    const movable = base
      .map((p, i) => ({ p, i }))
      .filter(
        ({ p }) => !p.fixed && contourOfT(contours, p.correctT) === contour,
      )
      .sort((a, b) => a.p.correctT - b.p.correctT);

    movable.forEach(({ i }, order) => {
      // İpucu: sıradaki bir noktayı doğru yerinde bırak
      if (order % 2 === 1) return;
      const { minT, maxT } = getContourBounds(base, i, contours);
      result[i]!.currentT = displaceInBounds(base[i]!.correctT, minT, maxT);
    });
  });

  return result;
}

/** 0 puan eşiği: köşegenin bu oranı kadar ortalama sapmada puan biter */
const SCORE_MAX_MISS_FRAC = 0.16;
/** Eğri üssü — >1 küçük sapmaya cömert, büyük sapmayı cezalandırır */
const SCORE_CURVE = 1.35;

/** Ortalama piksel sapması (bırakılan konum vs doğru konum) */
function averageMissPx(points: GamePoint[]): number {
  const moveable = points.filter((p) => !p.fixed);
  if (moveable.length === 0) return 0;
  const total = moveable.reduce(
    (sum, p) =>
      sum + Math.hypot(p.currentX - p.correctX, p.currentY - p.correctY),
    0,
  );
  return total / moveable.length;
}

/** Piksel sapmasını köşegene göre normalize edip 0-100 puana çevir */
function calculateScore(points: GamePoint[], diagonal: number): number {
  const moveable = points.filter((p) => !p.fixed);
  if (moveable.length === 0) return 0;

  const avgMiss = averageMissPx(points);
  const maxMiss = Math.max(1, diagonal * SCORE_MAX_MISS_FRAC);
  const t = Math.min(1, avgMiss / maxMiss);
  return Math.max(0, Math.round(100 * Math.pow(1 - t, SCORE_CURVE)));
}

function posFromT(
  path: SVGPathElement,
  total: number,
  t: number,
  frac: (t: number) => number = IDENTITY_FRAC,
): { x: number; y: number } {
  const pt = path.getPointAtLength(frac(Math.max(0, Math.min(1, t))) * total);
  return { x: pt.x, y: pt.y };
}

export default function BezierBrain({
  gameKey,
  sequenceIndex = 0,
  attemptIndex,
  isPlaying,
  onAnswer,
  onGameStart,
  onIntroComplete,
  addRoundScore,
  onGameComplete,
  timeLeft,
}: BezierBrainProps) {
  const character = useMemo(
    () => getBezierCharacter(sequenceIndex),
    [sequenceIndex],
  );
  const viewBox = useMemo(() => {
    const { w, h } = character.gameViewBox;
    const pad = character.viewBoxPad;
    return `${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}`;
  }, [character]);

  const [phase, setPhase] = useState<Phase>("intro");
  const [points, setPoints] = useState<GamePoint[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [pointsOpacity, setPointsOpacity] = useState(0);
  const [ghostOpacity, setGhostOpacity] = useState(0);
  const [flyScore, setFlyScore] = useState<number | null>(null);
  const [pathReady, setPathReady] = useState(false);
  const [doneExiting, setDoneExiting] = useState(false);

  const pointsRef = useRef<GamePoint[]>([]);
  const dragIndexRef = useRef<number | null>(null);
  const captureTargetRef = useRef<Element | null>(null);
  const endedRef = useRef(false);
  const canDragRef = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const letterRef = useRef<SVGGElement>(null);
  const letterWrapRef = useRef<HTMLDivElement>(null);
  const scoreAnchorRef = useRef<HTMLDivElement>(null);
  const doneWrapRef = useRef<HTMLDivElement>(null);
  const doneExitTweenRef = useRef<gsap.core.Tween | null>(null);
  const finishTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const totalLengthRef = useRef(0);
  const geometryRef = useRef<PathGeometry | null>(null);
  const pendingResultRef = useRef<{ score: number; correct: boolean } | null>(
    null,
  );
  const exitStartedRef = useRef(false);
  const letterExitDoneRef = useRef(false);
  const scoreFlyDoneRef = useRef(false);
  const descBoxRef = useRef<HTMLDivElement>(null);
  const gameBoardRef = useRef<HTMLDivElement>(null);
  const onGameStartRef = useRef(onGameStart);
  const onIntroCompleteRef = useRef(onIntroComplete);

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  useEffect(() => {
    dragIndexRef.current = dragIndex;
  }, [dragIndex]);

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

  useEffect(() => {
    let cancelled = false;
    let frameId = 0;

    const runGeometry = () => {
      const path = pathRef.current;
      if (!path || cancelled) return;

      const total = path.getTotalLength();
      totalLengthRef.current = total;

      const geometry = buildGeometry(path, total, character);
      geometryRef.current = geometry;
      const { frac, contours } = geometry;

      const base = buildGamePoints(path, total, character, geometry);
      const scattered = buildRoundPoints(base, contours);
      const synced = syncPointsPositions(path, total, scattered, frac);

      pointsRef.current = synced;
      setPoints(synced);
      setPathReady(true);

      if (letterWrapRef.current) {
        gsap.set(letterWrapRef.current, { scale: 1 });
      }
    };

    // Intro animasyonunu bloklamamak için geometriyi bir sonraki kareye ertele
    frameId = requestAnimationFrame(() => {
      frameId = requestAnimationFrame(runGeometry);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [gameKey, character]);

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
    const diagonal = Math.hypot(
      character.gameViewBox.w,
      character.gameViewBox.h,
    );
    const score100 = calculateScore(live, diagonal);

    pendingResultRef.current = {
      score: score100 * 10,
      correct: score100 >= 90,
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
        /** Bırakılan t'den doğru t'ye düz interpolasyon — hep çizgi üzerinde */
        gsap.to(p, {
          currentT: p.correctT,
          duration: SNAP_DURATION,
          ease: "power2.out",
          delay: order * SNAP_STAGGER,
          onUpdate: () => {
            const path = pathRef.current;
            const total = totalLengthRef.current;
            if (!path || total === 0) return;
            const frac = geometryRef.current?.frac ?? IDENTITY_FRAC;

            setPoints((prev) => {
              const next = prev.map((pt, idx) =>
                idx === index
                  ? applyCurrentPos(path, total, pt, p.currentT, frac)
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
  }, [phase, character]);

  useEffect(() => {
    let cancelled = false;
    const introAttempt = attemptIndex ?? sequenceIndex;

    queueMicrotask(() => {
      if (cancelled) return;
      endedRef.current = false;
      exitStartedRef.current = false;
      letterExitDoneRef.current = false;
      scoreFlyDoneRef.current = false;
      pendingResultRef.current = null;
      canDragRef.current = false;
      finishTimelineRef.current?.kill();
      doneExitTweenRef.current?.kill();
      setDoneExiting(false);
      if (doneWrapRef.current) {
        gsap.set(doneWrapRef.current, { opacity: 1, y: 0 });
      }
      setFlyScore(null);
      setGhostOpacity(0);
      setPointsOpacity(0);
      setDragIndex(null);
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
  }, [gameKey, sequenceIndex, attemptIndex]);

  useLayoutEffect(() => {
    if (phase !== "playing") return;
    prepareGameContentHidden({
      desc: descBoxRef.current,
      board: gameBoardRef.current,
    });
    if (letterRef.current) gsap.set(letterRef.current, { opacity: 0 });
  }, [phase, gameKey]);

  useEffect(() => {
    if (phase !== "playing") return;

    const opacityProxy = { value: 0 };

    const tl = runGameContentReveal(
      { desc: descBoxRef.current, board: gameBoardRef.current },
      () => onGameStartRef.current(),
    );

    if (letterRef.current) {
      tl.to(
        letterRef.current,
        { opacity: 1, duration: 1.05, ease: "power3.out" },
        GAME_REVEAL_STAGGER + 0.08,
      );
    }

    tl.to(
      opacityProxy,
      {
        value: 1,
        duration: 0.95,
        ease: "power3.out",
        onUpdate: () => setPointsOpacity(opacityProxy.value),
        onComplete: () => {
          canDragRef.current = true;
        },
      },
      GAME_REVEAL_STAGGER + 0.2,
    );

    return () => {
      tl.kill();
    };
  }, [phase, gameKey]);

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
      const geometry = geometryRef.current;
      const frac = geometry?.frac ?? IDENTITY_FRAC;
      const contours = geometry?.contours ?? [
        { start: 0, end: 1, offset: 0 },
      ];
      const { minT, maxT } = getContourBounds(pointsRef.current, index, contours);
      const newT = projectToPath(
        path,
        total,
        svgPos.x,
        svgPos.y,
        minT,
        maxT,
        point.currentT,
        frac,
        DRAG_WINDOW,
      );

      setPoints((prev) => {
        const path = pathRef.current;
        const total = totalLengthRef.current;
        if (!path || total === 0) return prev;

        const next = prev.map((p, i) =>
          i === index ? applyCurrentPos(path, total, p, newT, frac) : p,
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
    if (doneExiting || phase !== "playing" || endedRef.current) return;

    setDoneExiting(true);
    gsap.delayedCall(DONE_RELEASE_HOLD, () => {
      dismissDoneButton(finishGame);
    });
  }, [doneExiting, dismissDoneButton, finishGame, phase]);

  const introActive = introPendingPhase(phase);

  return (
    <div
      className="absolute inset-0 overflow-hidden select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <GameIntroOverlay
        ref={introCardRef}
        gameId="bezier-brain"
        description={DESC_COPY.body}
        playEnabled={introPlayEnabled}
        playPressed={introPlayPressed}
        onPlay={handleIntroPlay}
      />

      <GameDescBox
        ref={descBoxRef}
        gameId="bezier-brain"
        style={
          introActive
            ? { visibility: "hidden", pointerEvents: "none" }
            : undefined
        }
      >
        {DESC_COPY.body}
      </GameDescBox>

      <div
        ref={gameBoardRef}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          visibility: introActive ? "hidden" : "visible",
          pointerEvents: introActive ? "none" : "auto",
        }}
      >
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
              viewBox={viewBox}
              preserveAspectRatio="xMidYMid meet"
              className="h-full w-auto touch-none"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ touchAction: "none", display: "block", overflow: "visible" }}
              aria-label={`Letter ${character.label} outline`}
            >
              <g ref={letterRef} style={{ opacity: 0 }}>
                <path
                  d={character.path}
                  fill="#E5E5E5"
                  stroke="none"
                />
                <path
                  ref={pathRef}
                  d={character.path}
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
                              fill="#9AE66E"
                              stroke="#1A1A1A"
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
                            fill="#E5E5E5"
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

        {(phase === "playing" || doneExiting) && (
          <div
            ref={doneWrapRef}
            className="absolute left-1/2 z-20 -translate-x-1/2"
            style={{ bottom: "3%" }}
          >
            <DoneKeycap onPress={handleDone} disabled={doneExiting} />
          </div>
        )}

        {flyScore !== null && (
          <ScoreSideReveal
            key={flyScore}
            points={flyScore}
            anchorRef={scoreAnchorRef}
            anchorXOnly
            flyTargetLift={100}
            onFlyStart={runLetterExit}
            onScoreLand={() => handleScoreLand(flyScore)}
            onComplete={handleScoreFlyComplete}
          />
        )}
      </div>
    </div>
  );
}
