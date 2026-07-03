/** Bezier Brain — karakter varyasyonları (S, 2, …) */

export type BezierRail = "outer" | "inner";

export interface BezierPointDef {
  x: number;
  y: number;
  fixed: boolean;
  rail: BezierRail;
}

export interface BezierCharacter {
  id: string;
  label: string;
  /** Outline path (game koordinat uzayı) */
  path: string;
  /** Path koordinat uzayı (viewBox boyutu) */
  gameViewBox: { w: number; h: number };
  /** viewBox kenar boşluğu (nokta/stroke taşması için) */
  viewBoxPad: number;
  /** Movable noktaların koordinat uzayı — gameViewBox'a ölçeklenir */
  pointsViewBox: { w: number; h: number };
  /** Sabit köşeler — gameViewBox koordinatları */
  fixedCorners: BezierPointDef[];
  /** Taşınabilir siyah noktalar — pointsViewBox koordinatları */
  movablePoints: BezierPointDef[];
}

/* ─────────────────────────  S  ───────────────────────── */

const S_PATH =
  "M267.877 354L188.737 334.65C78.8169 306.51 23.4169 255.51 23.4169 166.69C23.4169 77.87 106.947 0.5 230.057 0.5C341.737 0.5 438.467 59.42 449.017 180.77H370.757C364.597 106.02 308.317 67.33 230.057 67.33C137.727 67.33 99.0269 116.57 99.0269 165.82C99.0269 219.46 133.327 248.48 213.347 267.83L295.127 287.18C408.567 315.32 467.487 370.72 467.487 458.66C467.487 558.91 377.787 638.93 242.367 638.93C99.9069 638.93 9.33687 557.15 0.536865 433.16H77.0469C87.5969 526.37 154.427 572.1 242.367 572.1C325.027 572.1 391.857 531.65 391.857 464.82C391.857 403.27 354.927 375.13 267.867 354.02L267.877 354Z";

const S_FIXED_CORNERS: BezierPointDef[] = [
  { x: 449.017, y: 180.77, fixed: true, rail: "outer" },
  { x: 370.757, y: 180.77, fixed: true, rail: "inner" },
  { x: 0.536865, y: 433.16, fixed: true, rail: "outer" },
  { x: 77.0469, y: 433.16, fixed: true, rail: "inner" },
];

/** Sfinal.svg siyah noktalar (viewBox 226×305) */
const S_MOVABLE_POINTS: BezierPointDef[] = [
  { x: 111.2, y: 4.622, fixed: false, rail: "inner" },
  { x: 111.2, y: 35.511, fixed: false, rail: "inner" },
  { x: 15.687, y: 81.439, fixed: false, rail: "inner" },
  { x: 50.643, y: 81.032, fixed: false, rail: "inner" },
  { x: 103.481, y: 128.181, fixed: false, rail: "inner" },
  { x: 141.279, y: 137.119, fixed: false, rail: "outer" },
  { x: 92.098, y: 159.069, fixed: false, rail: "inner" },
  { x: 128.681, y: 168.008, fixed: false, rail: "outer" },
  { x: 116.894, y: 268.807, fixed: false, rail: "inner" },
  { x: 110.936, y: 299.696, fixed: false, rail: "inner" },
  { x: 185.987, y: 219.219, fixed: false, rail: "outer" },
  { x: 220.938, y: 216.377, fixed: false, rail: "outer" },
];

/* ─────────────────────────  2  ───────────────────────── */

const TWO_PATH =
  "M233.2 0.5C357.669 0.500094 441.6 88.917 441.6 199.9C441.6 259.901 417.459 316.712 367.006 376.062C316.561 435.402 239.79 497.307 134.478 567.516L134.374 567.585L134.25 567.598L116.7 569.352V575.6H448.8V645.9H0.5V575.833L0.722656 575.685C136.172 485.235 226.582 417.31 283.129 358.965C339.664 300.631 362.3 251.924 362.3 199.9C362.3 129.079 308.526 72.5998 231.4 72.5996C192.372 72.5996 156.952 86.5048 130.615 112.729C104.278 138.954 86.9932 177.531 84.2988 226.927L84.2734 227.4H6.78613L6.7998 226.887C10.4069 91.6204 106.925 0.5 233.2 0.5Z";

/** Figma Group 75 — beyaz (sabit) köşe noktaları, outline koordinatları */
const TWO_FIXED_CORNERS: BezierPointDef[] = [
  { x: 3.821, y: 225.32, fixed: true, rail: "outer" },
  { x: 83.558, y: 225.32, fixed: true, rail: "outer" },
  { x: 114.169, y: 565.16, fixed: true, rail: "outer" },
  { x: 132.294, y: 565.16, fixed: true, rail: "outer" },
  { x: 114.169, y: 575.16, fixed: true, rail: "outer" },
  { x: 447.3, y: 573.101, fixed: true, rail: "outer" },
  { x: 447.3, y: 644.398, fixed: true, rail: "outer" },
  { x: 0.0, y: 644.398, fixed: true, rail: "outer" },
  { x: 0.0, y: 573.101, fixed: true, rail: "outer" },
];

/** Figma Group 75 — siyah (taşınabilir) noktalar, outline koordinatları */
const TWO_MOVABLE_POINTS: BezierPointDef[] = [
  { x: 233.65, y: 0.0, fixed: false, rail: "outer" },
  { x: 440.15, y: 199.5, fixed: false, rail: "outer" },
  { x: 362.65, y: 199.5, fixed: false, rail: "outer" },
  { x: 233.65, y: 71.0, fixed: false, rail: "outer" },
];

/* ─────────────────────────  Havuz  ───────────────────────── */

export const BEZIER_CHARACTERS: readonly BezierCharacter[] = [
  {
    id: "S",
    label: "S",
    path: S_PATH,
    gameViewBox: { w: 468, h: 640 },
    viewBoxPad: 14,
    pointsViewBox: { w: 226, h: 305 },
    fixedCorners: S_FIXED_CORNERS,
    movablePoints: S_MOVABLE_POINTS,
  },
  {
    id: "2",
    label: "2",
    path: TWO_PATH,
    gameViewBox: { w: 449, h: 646 },
    viewBoxPad: 14,
    pointsViewBox: { w: 449, h: 646 },
    fixedCorners: TWO_FIXED_CORNERS,
    movablePoints: TWO_MOVABLE_POINTS,
  },
];

export function getBezierCharacter(sequenceIndex: number): BezierCharacter {
  return BEZIER_CHARACTERS[
    ((sequenceIndex % BEZIER_CHARACTERS.length) + BEZIER_CHARACTERS.length) %
      BEZIER_CHARACTERS.length
  ]!;
}
