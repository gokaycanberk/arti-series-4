/** Maraton: 5 ana oyun — geçici olarak her biri 1 kez (tekrarlar sonraki faz). */
export const MARATHON_MAIN_GAMES = 5;

/** Oyun başına tur sayısı — Optical Panic: 3 kelime */
export const MARATHON_REPEATS: readonly number[] = [3, 1, 1, 1, 1];

export const MARATHON_TOTAL_STEPS = MARATHON_REPEATS.reduce(
  (sum, n) => sum + n,
  0,
);

/** Tamamlanan tur sayısı (0 … MARATHON_TOTAL_STEPS). */
export function computeMarathonStep(
  gameIndex: number,
  attemptIndex: number,
): number {
  let step = 0;
  for (let i = 0; i < gameIndex; i++) {
    step += MARATHON_REPEATS[i] ?? 1;
  }
  step += attemptIndex;
  return Math.min(step, MARATHON_TOTAL_STEPS);
}

/** Avatar konumu — 5 eşit segment. */
export function marathonAvatarPercent(step: number): number {
  if (MARATHON_TOTAL_STEPS <= 0) return 0;

  const clamped = Math.min(Math.max(0, step), MARATHON_TOTAL_STEPS);
  const segmentWidth = 100 / MARATHON_MAIN_GAMES;
  let remaining = clamped;
  let percent = 0;

  for (let i = 0; i < MARATHON_MAIN_GAMES; i++) {
    const subs = MARATHON_REPEATS[i] ?? 1;
    if (remaining <= 0) break;

    if (remaining >= subs) {
      percent += segmentWidth;
      remaining -= subs;
      continue;
    }

    percent += (remaining / subs) * segmentWidth;
    remaining = 0;
  }

  return Math.min(100, percent);
}

/** Segment içi alt bölüm sayısı (tekrar sayısı). */
export function marathonSubdivisions(segmentIndex: number): number {
  return MARATHON_REPEATS[segmentIndex] ?? 1;
}

export function getMarathonRepeats(gameIndex: number): number {
  return MARATHON_REPEATS[gameIndex] ?? 1;
}
