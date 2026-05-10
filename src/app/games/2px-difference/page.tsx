"use client";

import { GameShell } from "@/components/GameShell";
import type { GameShellChildState } from "@/components/GameShell";
import { getGameById } from "@/lib/games";
import { randomIntInclusive } from "@/lib/scoring";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const GAME_ID = "2px-difference" as const;
const DURATION = 30;

type ShapeKind = "circle" | "square" | "rectangle" | "triangle";
type Feedback = "correct" | "wrong" | null;

type CurrentRoundState = {
  shape: ShapeKind;
  baseSize: number;
  smallerSide: "left" | "right";
  positions: {
    left: { x: number; y: number };
    right: { x: number; y: number };
  };
};

type BBox = { left: number; top: number; width: number; height: number };

function rectsMinDistance(a: BBox, b: BBox): number {
  const ar = a.left + a.width;
  const br = b.left + b.width;
  const ab = a.top + a.height;
  const bb = b.top + b.height;
  const dx = Math.max(0, Math.max(a.left, b.left) - Math.min(ar, br));
  const dy = Math.max(0, Math.max(a.top, b.top) - Math.min(ab, bb));
  return Math.hypot(dx, dy);
}

function randomShape(): ShapeKind {
  const shapes: ShapeKind[] = ["circle", "square", "rectangle", "triangle"];
  return shapes[randomIntInclusive(0, shapes.length - 1)]!;
}

function getDimensions(shape: ShapeKind, base: number): { width: number; height: number } {
  switch (shape) {
    case "circle":
    case "square":
      return { width: base, height: base };
    case "triangle":
      return { width: base, height: base };
    case "rectangle":
      return {
        width: Math.round(base * 1.35),
        height: Math.round(base * 0.68),
      };
    default:
      return { width: base, height: base };
  }
}

function generateRound(cw: number, ch: number, pad: number): CurrentRoundState | null {
  for (let i = 0; i < 180; i++) {
    const baseSize = randomIntInclusive(80, 200);
    const shape = randomShape();
    const smallerSide: "left" | "right" = Math.random() < 0.5 ? "left" : "right";
    const big = getDimensions(shape, baseSize);
    const small = getDimensions(shape, baseSize - 2);
    const leftDim = smallerSide === "left" ? small : big;
    const rightDim = smallerSide === "right" ? small : big;

    const xL = pad + Math.random() * Math.max(0.1, cw - pad * 2 - leftDim.width);
    const yL = pad + Math.random() * Math.max(0.1, ch - pad * 2 - leftDim.height);
    const xR = pad + Math.random() * Math.max(0.1, cw - pad * 2 - rightDim.width);
    const yR = pad + Math.random() * Math.max(0.1, ch - pad * 2 - rightDim.height);

    const bl: BBox = { left: xL, top: yL, width: leftDim.width, height: leftDim.height };
    const br: BBox = { left: xR, top: yR, width: rightDim.width, height: rightDim.height };
    const dist = rectsMinDistance(bl, br);

    if (dist >= 60 && dist <= 300) {
      return {
        shape,
        baseSize,
        smallerSide,
        positions: {
          left: { x: xL, y: yL },
          right: { x: xR, y: yR },
        },
      };
    }
  }
  return null;
}

function fallbackRound(): CurrentRoundState {
  return {
    shape: "square",
    baseSize: 120,
    smallerSide: "left",
    positions: {
      left: { x: 48, y: 80 },
      right: { x: 260, y: 80 },
    },
  };
}

function computeScore(rounds: { correct: boolean }[]): number {
  if (rounds.length === 0) return 0;
  const correct = rounds.filter((r) => r.correct).length;
  return Math.round((correct / rounds.length) * 100);
}

function ShapeGraphic({
  kind,
  width,
  height,
}: {
  kind: ShapeKind;
  width: number;
  height: number;
}) {
  const common = { backgroundColor: "#000000", width, height } as const;

  if (kind === "circle") {
    return <div className="pointer-events-none shrink-0 rounded-full" style={common} aria-hidden />;
  }
  if (kind === "square") {
    return <div className="pointer-events-none shrink-0 rounded-none" style={common} aria-hidden />;
  }
  if (kind === "rectangle") {
    return (
      <div className="pointer-events-none shrink-0 rounded-none" style={common} aria-hidden />
    );
  }
  return (
    <div
      className="pointer-events-none shrink-0"
      style={{
        width,
        height,
        backgroundColor: "#000000",
        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
      }}
      aria-hidden
    />
  );
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

function TwoPxGameplay({
  isPlaying,
  setLiveScoreGetter,
}: Pick<GameShellChildState, "isPlaying"> & {
  setLiveScoreGetter?: (getter: () => number) => void;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const boardSeededRef = useRef(false);
  const [rounds, setRounds] = useState<{ correct: boolean }[]>([]);
  const [currentRound, setCurrentRound] = useState<CurrentRoundState | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const isZoomed = usePageZoomPenalty();
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushRoundAfterFeedback = useCallback((correct: boolean) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setFeedback(correct ? "correct" : "wrong");
    setRounds((prev) => [...prev, { correct }]);
    feedbackTimeoutRef.current = setTimeout(() => {
      const el = boardRef.current;
      const next =
        el && el.clientWidth > 120 && el.clientHeight > 120
          ? generateRound(el.clientWidth, el.clientHeight, 16)
          : null;
      setCurrentRound(next ?? fallbackRound());
      setFeedback(null);
    }, 200);
  }, []);

  const handlePick = useCallback(
    (side: "left" | "right") => {
      if (!isPlaying || !currentRound || feedback !== null || isZoomed) return;
      const ok = side === currentRound.smallerSide;
      pushRoundAfterFeedback(ok);
    },
    [currentRound, feedback, isPlaying, isZoomed, pushRoundAfterFeedback],
  );

  useLayoutEffect(() => {
    setLiveScoreGetter?.(() => computeScore(rounds));
  }, [rounds, setLiveScoreGetter]);

  useEffect(
    () => () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    },
    [],
  );

  useLayoutEffect(() => {
    if (isZoomed) {
      boardSeededRef.current = false;
      return;
    }
    const el = boardRef.current;
    if (!el) return;

    const trySeedBoard = () => {
      if (boardSeededRef.current) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w < 120 || h < 120) return;
      boardSeededRef.current = true;
      const r = generateRound(w, h, 16);
      setCurrentRound(r ?? fallbackRound());
    };

    trySeedBoard();

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => trySeedBoard())
        : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [isZoomed]);

  const leftDims = currentRound
    ? currentRound.smallerSide === "left"
      ? getDimensions(currentRound.shape, currentRound.baseSize - 2)
      : getDimensions(currentRound.shape, currentRound.baseSize)
    : { width: 0, height: 0 };

  const rightDims = currentRound
    ? currentRound.smallerSide === "right"
      ? getDimensions(currentRound.shape, currentRound.baseSize - 2)
      : getDimensions(currentRound.shape, currentRound.baseSize)
    : { width: 0, height: 0 };

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col gap-3 select-none"
      style={{ WebkitUserSelect: "none", userSelect: "none" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <p className="shrink-0 text-center text-sm leading-snug text-foreground/65">
        <span className="font-medium text-foreground/85">Küçük olanı seç.</span>{" "}
        İki şekil aynı renk ve tipte; biri tam 2 piksel daha küçük. Süre dolana
        dek mümkün olan en yüksek doğruluk skorunu yap.
      </p>
      {feedback === "correct" ? (
        <div
          className="pointer-events-none absolute inset-0 z-20 bg-emerald-500/35"
          aria-hidden
        />
      ) : null}
      {feedback === "wrong" ? (
        <div
          className="pointer-events-none absolute inset-0 z-20 bg-red-600/35"
          aria-hidden
        />
      ) : null}

      <div
        ref={boardRef}
        className="relative min-h-[min(24rem,calc(100vh-280px))] w-full flex-1 overflow-hidden rounded-2xl border border-foreground/10 bg-white shadow-inner"
      >
        {isZoomed ? (
          <div className="flex h-full min-h-[16rem] items-center justify-center px-6 text-center text-base font-medium text-neutral-900">
            Zoom yaparak hile yapamazsın 👀
          </div>
        ) : currentRound ? (
          <>
            <button
              type="button"
              className="absolute cursor-pointer rounded-md outline-none ring-foreground/20 focus-visible:ring-2"
              style={{
                left: currentRound.positions.left.x,
                top: currentRound.positions.left.y,
                width: leftDims.width,
                height: leftDims.height,
              }}
              onClick={() => handlePick("left")}
              aria-label="Sol şekil — daha küçük olan şekli seç"
            >
              <ShapeGraphic
                kind={currentRound.shape}
                width={leftDims.width}
                height={leftDims.height}
              />
            </button>
            <button
              type="button"
              className="absolute cursor-pointer rounded-md outline-none ring-foreground/20 focus-visible:ring-2"
              style={{
                left: currentRound.positions.right.x,
                top: currentRound.positions.right.y,
                width: rightDims.width,
                height: rightDims.height,
              }}
              onClick={() => handlePick("right")}
              aria-label="Sağ şekil — daha küçük olan şekli seç"
            >
              <ShapeGraphic
                kind={currentRound.shape}
                width={rightDims.width}
                height={rightDims.height}
              />
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function TwoPixelDifferencePage() {
  const game = getGameById(GAME_ID);

  if (!game) {
    return (
      <div className="mx-auto px-4 py-20 text-center text-sm">
        Oyun bulunamadı.
      </div>
    );
  }

  return (
    <GameShell
      resetKey={GAME_ID}
      gameName={game.name}
      description={game.description}
      duration={DURATION}
    >
      {({ isPlaying, setLiveScoreGetter }) => (
        <TwoPxGameplay isPlaying={isPlaying} setLiveScoreGetter={setLiveScoreGetter} />
      )}
    </GameShell>
  );
}
