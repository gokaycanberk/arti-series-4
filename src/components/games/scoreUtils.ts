const MAX_DISTANCE = 150;

export function scoreFromDistance(distance: number): number {
  const d = Math.min(Math.abs(distance), MAX_DISTANCE);
  return Math.round(1000 * (1 - d / MAX_DISTANCE));
}

interface NormalizedPoint {
  x: number;
  y: number;
}

/** İki noktanın doğru konuma ortalama px sapması — en iyi eşleşmeyi seçer */
export function averageGradientMissPx(
  guesses: readonly NormalizedPoint[],
  correct: readonly NormalizedPoint[],
  stageW: number,
  stageH: number,
): number {
  const dist = (a: NormalizedPoint, b: NormalizedPoint) =>
    Math.hypot((a.x - b.x) * stageW, (a.y - b.y) * stageH);

  // Noktalar değiştirilebilir: guess'leri correct'lere iki olası eşlemeden
  // hangisi daha küçük toplam veriyorsa onu kullan (çapraz yerleştirme cezalanmasın)
  const straight = dist(guesses[0]!, correct[0]!) + dist(guesses[1]!, correct[1]!);
  const swapped = dist(guesses[0]!, correct[1]!) + dist(guesses[1]!, correct[0]!);
  return Math.min(straight, swapped) / 2;
}

const MOVE_THRESHOLD_PX = 5;

/** Oyuncu noktalardan en az birini oynadı mı? */
export function hasUserMovedGuesses(
  startGuesses: readonly NormalizedPoint[],
  currentGuesses: readonly NormalizedPoint[],
  stageW: number,
  stageH: number,
): boolean {
  for (let i = 0; i < 2; i++) {
    const dx = (currentGuesses[i]!.x - startGuesses[i]!.x) * stageW;
    const dy = (currentGuesses[i]!.y - startGuesses[i]!.y) * stageH;
    if (Math.hypot(dx, dy) > MOVE_THRESHOLD_PX) return true;
  }
  return false;
}

/**
 * Gradient Guru — sürekli puanlama (100–1000).
 *
 * Sapma, sahne köşegenine göre normalize edilir (ekran boyutundan bağımsız).
 * Yakın temasları iyi ödüllendirir, ama uzak tahminlerde hızlıca tabana iner.
 * Basamak yok; oyuncu her piksel iyileştirmeyi puanda hisseder.
 */
export function scoreFromGradientDistance(
  avgDistancePx: number,
  stageW: number,
  stageH: number,
): number {
  const MIN_SCORE = 100;
  const MAX_SCORE = 1000;
  const RANGE = MAX_SCORE - MIN_SCORE;
  /** Köşegenin ~%25'i = minimum puana denk gelen sapma */
  const maxDist = Math.hypot(stageW, stageH) * 0.25;
  if (maxDist <= 0) return MIN_SCORE;

  const t = Math.min(Math.max(avgDistancePx, 0) / maxDist, 1);
  const accuracy = Math.pow(1 - t, 1.4);
  return Math.round(MIN_SCORE + RANGE * accuracy);
}

export function getScoreLabel(points: number): string | null {
  if (points === 0) return "NOPE!";
  if (points >= 900) return "UNREAL!";
  if (points >= 700) return "FINE!";
  if (points >= 500) return "OK!";
  return null;
}

/** Untitled Project: kaydedilen sekme sayısı → 0–1000 puan */
export function scoreFromUntitledSaves(saved: number): number {
  return Math.min(saved * 50, 1000);
}
