"use client";

import { GameShell } from "@/components/GameShell";
import type { GameShellChildState } from "@/components/GameShell";
import { getGameById } from "@/lib/games";
import { randomIntInclusive } from "@/lib/scoring";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

const GAME_ID = "color-mix" as const;
const DURATION = 45;

type HSL = { h: number; s: number; l: number };

type FeedbackState = {
  accuracy: number;
  level: "great" | "ok" | "poor";
};

type PaletteState = {
  sourceColor1: HSL;
  sourceColor2: HSL;
  targetMix: HSL;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** H: derece [0,360), S,L: yüzde [0,100]. */
function hslToRgb(hDeg: number, sPct: number, lPct: number): [number, number, number] {
  const h01 = ((((hDeg % 360) + 360) % 360) / 360);
  const s = clamp(sPct, 0, 100) / 100;
  const l = clamp(lPct, 0, 100) / 100;

  if (s <= Number.EPSILON) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const r = hue2rgb(p, q, h01 + 1 / 3);
  const g = hue2rgb(p, q, h01);
  const b = hue2rgb(p, q, h01 - 1 / 3);

  return [
    Math.round(clamp(r, 0, 1) * 255),
    Math.round(clamp(g, 0, 1) * 255),
    Math.round(clamp(b, 0, 1) * 255),
  ];
}

/** R,G,B tam sayı → H [0,360), S,L yüzde. */
function rgbToHsl(rr: number, gg: number, bb: number): [number, number, number] {
  const r = clamp(rr / 255, 0, 1);
  const g = clamp(gg / 255, 0, 1);
  const b = clamp(bb / 255, 0, 1);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const li = (max + min) / 2;

  let hue = 0;
  let sat = 0;

  const d = max - min;

  if (d > Number.EPSILON) {
    sat = li > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        hue = ((b - r) / d + 2) / 6;
        break;
      default:
        hue = ((r - g) / d + 4) / 6;
        break;
    }
  }

  const HNorm = ((hue % 1) + 1) % 1;
  return [HNorm * 360, clamp(sat * 100, 0, 100), clamp(li * 100, 0, 100)];
}

function mixColors(c1: HSL, c2: HSL): HSL {
  const [r1, g1, b1] = hslToRgb(c1.h, c1.s, c1.l);
  const [r2, g2, b2] = hslToRgb(c2.h, c2.s, c2.l);
  const [h, s, l] = rgbToHsl(
    Math.round((r1 + r2) / 2),
    Math.round((g1 + g2) / 2),
    Math.round((b1 + b2) / 2),
  );
  return { h, s, l };
}

function circularHueSeparation(h1: number, h2: number): number {
  const raw = Math.abs(h1 - h2) % 360;
  return Math.min(raw, 360 - raw);
}

function generateSourcePair(): [HSL, HSL] {
  for (let i = 0; i < 120; i++) {
    const a: HSL = {
      h: randomIntInclusive(0, 359),
      s: randomIntInclusive(40, 100),
      l: randomIntInclusive(30, 70),
    };
    const b: HSL = {
      h: randomIntInclusive(0, 359),
      s: randomIntInclusive(40, 100),
      l: randomIntInclusive(30, 70),
    };

    if (circularHueSeparation(a.h, b.h) >= 30) return [a, b];
  }

  const fallback: [HSL, HSL] = [
    { h: 0, s: 90, l: 50 },
    { h: 210, s: 90, l: 50 },
  ];

  return fallback;
}

function newPalette(): PaletteState {
  const [sourceColor1, sourceColor2] = generateSourcePair();
  const targetMix = mixColors(sourceColor1, sourceColor2);
  return { sourceColor1, sourceColor2, targetMix };
}

function roundAccuracyPct(targetS: number, targetL: number, guessS: number, guessL: number): number {
  const dS = Math.abs(targetS - guessS);
  const dL = Math.abs(targetL - guessL);
  return Math.max(0, 100 - (dS + dL) / 2);
}

function feedbackLevel(acc: number): FeedbackState["level"] {
  if (acc > 85) return "great";
  if (acc >= 60) return "ok";
  return "poor";
}

function hslCss(c: HSL): string {
  return `hsl(${c.h} ${c.s}% ${c.l}%)`;
}

function finalAvgScore(acc: number[]): number {
  if (acc.length === 0) return 0;
  return Math.round(acc.reduce((a, b) => a + b, 0) / acc.length);
}

function paintPickerCanvas(canvas: HTMLCanvasElement, hue: number) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext("2d");
  if (!ctx || w < 2 || h < 2) return;

  const img = ctx.createImageData(w, h);
  const d = img.data;
  const xf = w - 1 || 1;
  const yf = h - 1 || 1;

  for (let py = 0; py < h; py++) {
    const lightness = 100 - (py / yf) * 100;
    for (let px = 0; px < w; px++) {
      const saturation = (px / xf) * 100;
      const [r, g, b] = hslToRgb(hue, saturation, lightness);
      const i = (py * w + px) * 4;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function ColorMixPlay({
  isPlaying,
  setLiveScoreGetter,
}: Pick<GameShellChildState, "isPlaying"> & {
  setLiveScoreGetter?: (getter: () => number) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef(false);

  const [dimensions, setDimensions] = useState({ w: 250, h: 250 });

  const [palette, setPalette] = useState<PaletteState>(newPalette);
  const { sourceColor1, sourceColor2, targetMix } = palette;

  const [guessS, setGuessS] = useState(50);
  const [guessL, setGuessL] = useState(50);
  const [roundAccuracies, setRoundAccuracies] = useState<number[]>([]);
  const [roundCount, setRoundCount] = useState(1);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const hydrateRound = useCallback(() => {
    setPalette(newPalette());
    setGuessS(50);
    setGuessL(50);
    setFeedback(null);
    draggingRef.current = false;
  }, []);

  useLayoutEffect(() => {
    const wrap = wrapperRef.current;
    if (!wrap || typeof ResizeObserver === "undefined") return;

    const apply = () => {
      const wpx = wrap.clientWidth;
      const size =
        Math.max(
          200,
          Math.min(250, Math.floor(Number.isFinite(wpx) ? wpx : 250)),
        );

      setDimensions((d) =>
        Math.abs(d.w - size) < 6 && Math.abs(d.h - size) < 6 ?
          d
        : { w: size, h: size },
      );
    };

    apply();

    const ro = new ResizeObserver(() => apply());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    setLiveScoreGetter?.(() => finalAvgScore(roundAccuracies));
  }, [roundAccuracies, setLiveScoreGetter]);

  useLayoutEffect(() => {
    const c = canvasRef.current;
    if (!c || !isPlaying || feedback !== null) return;
    const { w, h } = dimensions;
    if (w < 2 || h < 2) return;
    c.width = w;
    c.height = h;
    paintPickerCanvas(c, targetMix.h);
  }, [dimensions, feedback, isPlaying, targetMix.h]);

  const syncGuessFromPointer = useCallback((clientX: number, clientY: number, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const x = clamp((clientX - rect.left) / (rect.width || 1), 0, 1);
    const y = clamp((clientY - rect.top) / (rect.height || 1), 0, 1);

    setGuessS(x * 100);
    setGuessL((1 - y) * 100);
  }, []);

  const onPointerDownCanvas = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (feedback != null || !isPlaying) return;

      draggingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      syncGuessFromPointer(e.clientX, e.clientY, e.currentTarget);
    },
    [feedback, isPlaying, syncGuessFromPointer],
  );

  const onPointerMoveCanvas = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!draggingRef.current || feedback != null || !isPlaying) return;

      syncGuessFromPointer(e.clientX, e.clientY, e.currentTarget);
    },
    [feedback, isPlaying, syncGuessFromPointer],
  );

  const onPointerEndCanvas = useCallback(() => {
    draggingRef.current = false;
  }, []);

  const handleConfirm = useCallback(() => {
    if (!isPlaying || feedback != null) return;

    const acc = roundAccuracyPct(targetMix.s, targetMix.l, guessS, guessL);
    setRoundAccuracies((prev) => [...prev, acc]);
    setFeedback({ accuracy: acc, level: feedbackLevel(acc) });

    window.setTimeout(() => {
      setRoundCount((n) => n + 1);
      hydrateRound();
    }, 500);
  }, [feedback, guessL, guessS, hydrateRound, isPlaying, targetMix.l, targetMix.s]);

  const previewHsl = { h: targetMix.h, s: guessS, l: guessL };
  const guessCss = hslCss(previewHsl);
  const targetCss = hslCss(targetMix);

  if (!isPlaying) {
    return null;
  }

  return (
    <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-6 pb-4">
      <p className="absolute right-0 top-0 text-sm font-medium tabular-nums text-foreground/65">
        Round {roundCount}
      </p>

      <div className="grid gap-10 pt-8 lg:grid-cols-[auto,1fr] lg:gap-14">
        <div className="flex flex-col items-center gap-6 lg:items-start">
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
            Kaynaklar
          </span>
          <div className="flex flex-row items-center gap-6 lg:flex-col">
            <div
              className="h-[100px] w-[100px] shrink-0 rounded-xl border border-foreground/10 shadow-md"
              style={{ background: hslCss(sourceColor1) }}
              aria-hidden
            />
            <span className="text-2xl font-light text-neutral-950">+</span>
            <div
              className="h-[100px] w-[100px] shrink-0 rounded-xl border border-foreground/10 shadow-md"
              style={{ background: hslCss(sourceColor2) }}
              aria-hidden
            />
          </div>
          <p className="max-w-[14rem] text-center text-[10px] leading-relaxed text-foreground/45 lg:text-left">
            hsl({Math.round(sourceColor1.h)}°,{" "}
            {Math.round(sourceColor1.s)}%, {Math.round(sourceColor1.l)}%) ·
            hsl({Math.round(sourceColor2.h)}°, {Math.round(sourceColor2.s)}%,{" "}
            {Math.round(sourceColor2.l)}%)
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col flex-wrap gap-10 sm:flex-row sm:items-start">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
                Tahmin
              </span>
              <div
                className="h-[100px] w-[100px] rounded-xl border border-foreground/10 shadow-inner"
                style={{ backgroundColor: guessCss }}
                aria-label="Canlı tahmin önizlemesi"
              />
              <span className="text-[11px] text-foreground/45">
                S {guessS.toFixed(0)}% · L {guessL.toFixed(0)}%
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-foreground/50">
                Hue {Math.round(targetMix.h)}° (sabit)
              </span>
              <div
                ref={wrapperRef}
                className="relative mx-auto aspect-square touch-none sm:mx-0"
                style={{ width: "min(250px, 100%)", height: "min(250px, 100%)" }}
              >
                <canvas
                  ref={canvasRef}
                  className="h-full w-full rounded-lg shadow-inner ring-1 ring-black/10 cursor-crosshair"
                  style={{ aspectRatio: 1 }}
                  onPointerDown={onPointerDownCanvas}
                  onPointerMove={onPointerMoveCanvas}
                  onPointerUp={onPointerEndCanvas}
                  onPointerCancel={onPointerEndCanvas}
                />
                {feedback === null ? (
                  <div
                    className="pointer-events-none absolute box-border h-2.5 w-2.5 rounded-full border-2 border-neutral-950 bg-white shadow"
                    style={{
                      left: `${clamp(guessS, 0, 100)}%`,
                      top: `${100 - clamp(guessL, 0, 100)}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                    aria-hidden
                  />
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              disabled={feedback !== null}
              onClick={handleConfirm}
              className="rounded-full bg-neutral-950 px-12 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Onayla
            </button>
          </div>
        </div>
      </div>

      {feedback ?
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-6 md:absolute md:inset-0 md:rounded-[inherit]">
          <div className="w-full max-w-sm rounded-xl border border-foreground/10 bg-background p-6 shadow-2xl">
            <div className="flex justify-center gap-6">
              <div className="flex flex-col items-center gap-1">
                <div
                  className="h-16 w-16 rounded-xl border shadow-sm"
                  style={{ backgroundColor: guessCss }}
                />
                <span className="text-[10px] text-foreground/45">Sen</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div
                  className="h-16 w-16 rounded-xl border shadow-sm"
                  style={{ backgroundColor: targetCss }}
                />
                <span className="text-[10px] text-foreground/45">Gerçek</span>
              </div>
            </div>
            <p
              className={`mt-6 text-center text-4xl font-bold tabular-nums ${
                feedback.level === "great" ?
                  "text-emerald-600"
                : feedback.level === "ok" ?
                  "text-amber-500"
                : "text-red-500"
              }`}
            >
              {Math.round(feedback.accuracy)}%
            </p>
            <p
              className={`mt-2 text-center text-sm font-semibold ${
                feedback.level === "great" ?
                  "text-emerald-600"
                : feedback.level === "ok" ?
                  "text-amber-600"
                : "text-red-600"
              }`}
            >
              {feedback.level === "great" ?
                "Mükemmel!"
              : feedback.level === "ok" ?
                "İyi!"
              : "Uzak..."}
            </p>
          </div>
        </div>
      : null}
    </div>
  );
}

export default function ColorMixPage() {
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
      {(state) => (
        <ColorMixPlay
          isPlaying={state.isPlaying}
          setLiveScoreGetter={state.setLiveScoreGetter}
        />
      )}
    </GameShell>
  );
}
