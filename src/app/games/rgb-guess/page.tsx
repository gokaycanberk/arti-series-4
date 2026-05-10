"use client";

import { GameShell } from "@/components/GameShell";
import type { GameShellChildState } from "@/components/GameShell";
import { getGameById } from "@/lib/games";
import { randomIntInclusive } from "@/lib/scoring";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

const GAME_ID = "rgb-guess" as const;
const DURATION = 45;
const GRAY_START = { r: 128, g: 128, b: 128 } as const;

type RGB = { r: number; g: number; b: number };
type Feedback = "great" | "ok" | "poor" | null;

function manhattan(a: RGB, b: RGB): number {
  return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
}

function clampByte(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(255, Math.round(n)));
}

function generateRandomTarget(prev: RGB | null): RGB {
  for (let i = 0; i < 240; i++) {
    const c: RGB = {
      r: randomIntInclusive(0, 255),
      g: randomIntInclusive(0, 255),
      b: randomIntInclusive(0, 255),
    };
    if (prev == null || manhattan(c, prev) >= 100) return c;
  }
  if (prev == null) {
    return {
      r: randomIntInclusive(0, 255),
      g: randomIntInclusive(0, 255),
      b: randomIntInclusive(0, 255),
    };
  }
  const shift = prev.r <= 155 ? 120 : -120;
  return {
    r: clampByte(prev.r + shift),
    g: clampByte(prev.g),
    b: clampByte(prev.b),
  };
}

function roundAccuracy(target: RGB, guess: RGB): number {
  const err =
    Math.abs(target.r - guess.r) +
    Math.abs(target.g - guess.g) +
    Math.abs(target.b - guess.b);
  return 100 - (err / 765) * 100;
}

function feedbackForAccuracy(acc: number): Exclude<Feedback, null> {
  if (acc > 90) return "great";
  if (acc >= 60) return "ok";
  return "poor";
}

function finalScoreFromRounds(accuracies: number[]): number {
  if (accuracies.length === 0) return 0;
  const sum = accuracies.reduce((a, b) => a + b, 0);
  return Math.round(sum / accuracies.length);
}

function RgbChannelRow({
  label,
  value,
  disabled,
  accentColor,
  onChange,
}: {
  label: "R" | "G" | "B";
  value: number;
  disabled: boolean;
  accentColor: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex w-full max-w-xl flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
      <span className="w-6 shrink-0 text-sm font-semibold tabular-nums text-foreground/80">
        {label}
      </span>
      <input
        type="range"
        min={0}
        max={255}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full flex-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        style={{ accentColor }}
        aria-label={`${label} kanalı`}
      />
      <input
        type="number"
        min={0}
        max={255}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(clampByte(Number(e.target.value)))}
        className="w-full shrink-0 rounded-lg border border-[#E5E5E5] bg-background px-2 py-1.5 text-center text-sm font-medium tabular-nums text-foreground outline-none sm:w-16"
      />
    </div>
  );
}

function RgbGuessPlay({
  isPlaying,
  setLiveScoreGetter,
}: Pick<GameShellChildState, "isPlaying" | "setLiveScoreGetter">) {
  const [targetColor, setTargetColor] = useState<RGB>(() =>
    generateRandomTarget(null),
  );
  const [guessColor, setGuessColor] = useState<RGB>({ ...GRAY_START });
  const [roundAccuracies, setRoundAccuracies] = useState<number[]>([]);
  const [roundCount, setRoundCount] = useState(1);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmLockRef = useRef(false);

  const controlsLocked = !isPlaying || feedback !== null;

  const setChannel = useCallback((key: keyof RGB, v: number) => {
    setGuessColor((g) => ({ ...g, [key]: clampByte(v) }));
  }, []);

  const handleConfirm = useCallback(() => {
    if (controlsLocked || confirmLockRef.current) return;
    confirmLockRef.current = true;
    const acc = roundAccuracy(targetColor, guessColor);
    const bucket = feedbackForAccuracy(acc);

    setRoundAccuracies((prev) => [...prev, acc]);
    setFeedback(bucket);

    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    const prevTarget = targetColor;
    feedbackTimerRef.current = setTimeout(() => {
      setTargetColor(generateRandomTarget(prevTarget));
      setGuessColor({ ...GRAY_START });
      setRoundCount((n) => n + 1);
      setFeedback(null);
      feedbackTimerRef.current = null;
      confirmLockRef.current = false;
    }, 300);
  }, [controlsLocked, guessColor, targetColor]);

  useLayoutEffect(() => {
    setLiveScoreGetter?.(() => finalScoreFromRounds(roundAccuracies));
  }, [roundAccuracies, setLiveScoreGetter]);

  useEffect(
    () => () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    },
    [],
  );

  const guessBorderClass =
    feedback === "great"
      ? "border-4 border-emerald-500"
      : feedback === "ok"
        ? "border-4 border-amber-400"
        : feedback === "poor"
          ? "border-4 border-red-500"
          : "border border-[#E5E5E5]";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <p className="text-center text-sm font-medium tabular-nums text-foreground/75">
        Round {roundCount}
      </p>

      <div className="flex flex-col items-center justify-center gap-6 lg:flex-row lg:items-start lg:gap-10">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
            Hedef
          </span>
          <div
            className="h-[200px] w-[200px] shrink-0 rounded-xl border border-[#E5E5E5] shadow-sm"
            style={{ backgroundColor: `rgb(${targetColor.r},${targetColor.g},${targetColor.b})` }}
            aria-label="Hedef renk"
            role="img"
          />
        </div>

        <div className="hidden text-lg font-semibold text-foreground/30 lg:flex lg:self-center lg:pt-8">
          vs
        </div>

        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
            Tahmin
          </span>
          <div
            className={`h-[200px] w-[200px] shrink-0 rounded-xl shadow-sm transition-[border-color,border-width] duration-150 ${guessBorderClass}`}
            style={{
              backgroundColor: `rgb(${guessColor.r},${guessColor.g},${guessColor.b})`,
            }}
            aria-label="Tahmin renginiz"
            role="img"
          />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-1">
        <RgbChannelRow
          label="R"
          value={guessColor.r}
          disabled={controlsLocked}
          accentColor="#dc2626"
          onChange={(v) => setChannel("r", v)}
        />
        <RgbChannelRow
          label="G"
          value={guessColor.g}
          disabled={controlsLocked}
          accentColor="#16a34a"
          onChange={(v) => setChannel("g", v)}
        />
        <RgbChannelRow
          label="B"
          value={guessColor.b}
          disabled={controlsLocked}
          accentColor="#2563eb"
          onChange={(v) => setChannel("b", v)}
        />
      </div>

      <div className="flex justify-center pb-2">
        <button
          type="button"
          disabled={controlsLocked}
          onClick={handleConfirm}
          className="rounded-full bg-neutral-950 px-12 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Onayla
        </button>
      </div>
    </div>
  );
}

export default function RgbGuessPage() {
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
        <RgbGuessPlay
          isPlaying={isPlaying}
          setLiveScoreGetter={setLiveScoreGetter}
        />
      )}
    </GameShell>
  );
}
