import { MARATHON_TOTAL_STEPS } from "@/lib/marathon";

/** Her turun teorik maksimumu (0–1000). */
const MAX_PER_ROUND = 1000;

/** Maraton max: (4×3 + 1) × 1000 = 13.000 */
export const MARATHON_MAX_SCORE = MARATHON_TOTAL_STEPS * MAX_PER_ROUND;

/** Halka kademesi eşikleri — toplam skor / max oranı */
export const RING_TIER_THRESHOLDS = {
  /** %80+ müthiş */
  best: 0.8,
  /** %60–80 iyi */
  high: 0.6,
  /** %40–60 orta */
  average: 0.4,
  /** %40 altı kötü → low_point */
} as const;

type RingTier = "low_point" | "average" | "high_point" | "best_point";

/** Her kademe için 2 mesaj varyantı — public/scoreboard/*.png */
const RING_VARIANTS: Record<RingTier, readonly string[]> = {
  low_point: ["/scoreboard/low_point_1.png", "/scoreboard/low_point_2.png"],
  average: ["/scoreboard/average_1.png", "/scoreboard/average_2.png"],
  high_point: ["/scoreboard/high_point_1.png", "/scoreboard/high_point_2.png"],
  best_point: ["/scoreboard/best_point_1.png", "/scoreboard/best_point_2.png"],
};

export function getRingTier(score: number): RingTier {
  const ratio = MARATHON_MAX_SCORE > 0 ? score / MARATHON_MAX_SCORE : 0;
  if (ratio >= RING_TIER_THRESHOLDS.best) return "best_point";
  if (ratio >= RING_TIER_THRESHOLDS.high) return "high_point";
  if (ratio >= RING_TIER_THRESHOLDS.average) return "average";
  return "low_point";
}

/** Skora göre halka görselini seç; kademe içinden rastgele varyant. */
export function getScoreRingImage(score: number): string {
  const tier = getRingTier(score);
  const variants = RING_VARIANTS[tier];
  const index = Math.floor(Math.random() * variants.length);
  return variants[index] ?? variants[0]!;
}
