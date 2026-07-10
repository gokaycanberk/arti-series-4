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

/** Figma stack — alttan üste belirir (Desktop 11/13) */
export const SCORE_STACK_COLORS = [
  "#FF3355",
  "#FF9869",
  "#FFD52E",
  "#FF57B3",
  "#9255D4",
  "#4F8AFF",
  "#3AE091",
  "#45EDE2",
] as const;

export const SCORE_STACK_LAYERS = SCORE_STACK_COLORS.length;
/** Figma: katmanlar arası ~15px */
export const SCORE_STACK_STEP = 15;

/** Skor popup başlangıcını ekranda biraz aşağı kaydırır — scoreboard kavisini düzeltir */
export const SCORE_ORIGIN_Y_OFFSET = 75;

export type ScoreLabel =
  | "UNREAL!"
  | "SMOOTH!"
  | "OK!"
  | "NOPE!"
  | "WHAT?";

export function getScoreLabel(points: number): ScoreLabel | null {
  if (points >= 900) return "UNREAL!";
  if (points >= 700) return "SMOOTH!";
  if (points >= 500) return "OK!";
  if (points < 300) {
    if (points === 0) return "NOPE!";
    return points < 150 ? "WHAT?" : "NOPE!";
  }
  return null;
}

/** Etiket çakılma şiddeti — UNREAL! en sert BAM */
export type LabelImpact = {
  startScale: number;
  overshoot: number;
  slam: number;
  settle: number;
  startRotation: number;
};

export function getLabelImpact(label: ScoreLabel): LabelImpact {
  switch (label) {
    case "UNREAL!":
      return {
        startScale: 4.2,
        overshoot: 1.24,
        slam: 0.07,
        settle: 0.055,
        startRotation: -28,
      };
    case "SMOOTH!":
      return {
        startScale: 3.4,
        overshoot: 1.16,
        slam: 0.085,
        settle: 0.065,
        startRotation: -24,
      };
    default:
      return {
        startScale: 3,
        overshoot: 1.12,
        slam: 0.095,
        settle: 0.07,
        startRotation: -22,
      };
  }
}

/** Untitled Project: kaydedilen sekme sayısı → 0–1000 puan (~20 kayıt = max, 30 sn) */
export function scoreFromUntitledSaves(saved: number): number {
  return Math.min(saved * 50, 1000);
}
