/** Gradient Guru — 7 gradient havuzu, oturumda 3 benzersiz seçim */

export interface GradientGuruPoint {
  x: number;
  y: number;
}

export interface GradientGuruRound {
  id: number;
  image: string;
  /** Gradient başlangıç noktası (sol üst bracket yakını) */
  start: GradientGuruPoint;
  /** Gradient bitiş noktası (sağ alt bracket yakını) */
  end: GradientGuruPoint;
}

/**
 * Figma Desktop 71 + Desktop 170–175 — Group 13/14 merkezleri.
 * Normalize: gradient kutusu (≈1146×644.625) içinde 0–1.
 */
export const GRADIENT_GURU_ROUNDS: readonly GradientGuruRound[] = [
  {
    id: 1,
    image: "/gradients/Gradient_1_bos.jpg",
    start: { x: 0.128709, y: 0.208851 },
    end: { x: 0.870419, y: 0.792702 },
  },
  {
    id: 2,
    image: "/gradients/Gradient_2_bos.jpg",
    start: { x: 0.183797, y: 0.63332 },
    end: { x: 0.84325, y: 0.442326 },
  },
  {
    id: 3,
    image: "/gradients/Gradient_3_bos.jpg",
    start: { x: 0.161772, y: 0.760083 },
    end: { x: 0.829711, y: 0.162885 },
  },
  {
    id: 4,
    image: "/gradients/Gradient_4_bos.jpg",
    start: { x: 0.186205, y: 0.216356 },
    end: { x: 0.90301, y: 0.611984 },
  },
  {
    id: 5,
    image: "/gradients/Gradient_5_bos.jpg",
    start: { x: 0.219148, y: 0.664522 },
    end: { x: 0.832987, y: 0.295363 },
  },
  {
    id: 6,
    image: "/gradients/Gradient_6_bos.jpg",
    start: { x: 0.195803, y: 0.184373 },
    end: { x: 0.865488, y: 0.842168 },
  },
  {
    id: 7,
    image: "/gradients/Gradient_7_bos.jpg",
    start: { x: 0.120773, y: 0.810852 },
    end: { x: 0.768643, y: 0.235372 },
  },
] as const;

export const GRADIENT_GURU_POOL_SIZE = GRADIENT_GURU_ROUNDS.length;
export const GRADIENT_GURU_SESSION_LENGTH = 3;

/** Oturumda 3 farklı gradient index'i — tekrar yok */
export function pickGradientGuruSession(
  length = GRADIENT_GURU_SESSION_LENGTH,
): number[] {
  const indices = GRADIENT_GURU_ROUNDS.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = indices[i]!;
    indices[i] = indices[j]!;
    indices[j] = tmp;
  }
  return indices.slice(0, length);
}

export function getGradientGuruRound(
  sessionPicks: readonly number[],
  sequenceIndex: number,
): GradientGuruRound {
  const poolIndex = sessionPicks[sequenceIndex];
  if (poolIndex === undefined) {
    return GRADIENT_GURU_ROUNDS[sequenceIndex % GRADIENT_GURU_ROUNDS.length]!;
  }
  return GRADIENT_GURU_ROUNDS[poolIndex]!;
}
