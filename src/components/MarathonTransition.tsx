"use client";

import { motion } from "framer-motion";

interface MarathonTransitionProps {
  /** Bitirilen oyunun 1 tabanlı sırası. */
  roundLabel: number;
  totalRounds: number;
  averageSoFar: number;
}

/**
 * Maraton içi ara ekranı — tur bilgisi ve şu ana kadarki ortalama özeti.
 * (Asıl CTA GameShell içindeki ScoreDisplay üzerinden verilir.)
 */
export function MarathonTransition({
  roundLabel,
  totalRounds,
  averageSoFar,
}: MarathonTransitionProps) {
  return (
    <motion.div
      className="flex flex-col gap-2 text-center text-sm text-foreground/60"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <p className="uppercase tracking-[0.25em]">
        Tur {roundLabel} / {totalRounds}
      </p>
      <p>
        Ortalama:{" "}
        <span className="font-semibold text-foreground">
          {averageSoFar.toFixed(1)}
        </span>
      </p>
      {roundLabel > 1 && (
        <p className="text-xs text-foreground/40">
          Tamamlanan oyunların birikmiş ortalaması.
        </p>
      )}
    </motion.div>
  );
}
