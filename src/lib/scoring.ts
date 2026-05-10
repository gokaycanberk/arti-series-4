/**
 * Skor yardımcıları — placeholder döneminde rastgele skor üretimi ve sınırlama.
 */

/** [min, max] dahil rastgele tam sayı. */
export function randomIntInclusive(min: number, max: number): number {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

/** Placeholder: gerçek oyun mantığı gelene kadar 50–100 arası skor. */
export function generatePlaceholderScore(): number {
  return randomIntInclusive(50, 100);
}

export function clampScore(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

/** Maraton ortalaması — skor yoksa 0. */
export function averageScores(scores: number[]): number {
  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}
