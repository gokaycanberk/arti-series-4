"use client";

import { animate, motion } from "framer-motion";
import { useEffect, useState } from "react";

interface ScoreDisplayProps {
  score: number;
  label?: string;
  isMarathon: boolean;
  onMarathonNext: () => void;
  onReplay: () => void;
  onHome: () => void;
}

/**
 * Oyun sonu skor ekranı — 0–100 skorunu büyük tipografi ve sayaç animasyonu ile gösterir.
 */
export function ScoreDisplay({
  score,
  label = "Skorun",
  isMarathon,
  onMarathonNext,
  onReplay,
  onHome,
}: ScoreDisplayProps) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const controls = animate(0, score, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplayScore(Math.round(v)),
    });
    return () => controls.stop();
  }, [score]);

  return (
    <motion.div
      className="flex w-full max-w-md flex-col items-center gap-8 text-center"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-foreground/60">
          {label}
        </p>
        <p className="text-7xl font-semibold tracking-tighter text-accent sm:text-8xl">
          {displayScore}
          <span className="align-top text-3xl text-foreground/40">/100</span>
        </p>
      </div>

      <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        {isMarathon ? (
          <button
            type="button"
            onClick={onMarathonNext}
            className="rounded-full bg-foreground px-8 py-3 text-sm font-medium text-background transition hover:opacity-90"
          >
            Sonraki Oyun
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onReplay}
              className="rounded-full bg-foreground px-8 py-3 text-sm font-medium text-background transition hover:opacity-90"
            >
              Tekrar Oyna
            </button>
            <button
              type="button"
              onClick={onHome}
              className="rounded-full border border-subtle px-8 py-3 text-sm font-medium text-foreground transition hover:bg-subtle/60"
            >
              Ana Sayfa
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
