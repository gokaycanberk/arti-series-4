/** Maraton: 5 ana oyun — ilk 4'ü 3'er kez, son oyun tek tur (zamana karşı). */
export const MARATHON_MAIN_GAMES = 5;

export const MARATHON_REPEATS: readonly number[] = [3, 3, 3, 3, 1];

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

/** Avatar konumu — 5 eşit segment; ilk 4'ünde 3'er alt tur (toplam 13 adım). */
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

/** Segment içi alt bölüm sayısı (1–3). */
export function marathonSubdivisions(segmentIndex: number): number {
  return segmentIndex < MARATHON_MAIN_GAMES - 1 ? 3 : 1;
}
