/** Retina Check — şekil + renk varyasyonları */

import type { CSSProperties } from "react";

export type RetinaShape = "square" | "circle" | "triangle";

/** Kare — Figma Desktop-177+ */
export const RETINA_SQUARE_COLORS = [
  "#FF3535",
  "#4F8AFF",
  "#FF9869",
] as const;

/** Yuvarlak — Figma Desktop-181/182/183 */
export const RETINA_CIRCLE_COLORS = [
  "#9255D4",
  "#3AE091",
  "#FF57B3",
] as const;

/** Üçgen — Figma Desktop-184/185/186 */
export const RETINA_TRIANGLE_COLORS = [
  "#FF9869",
  "#4F8AFF",
  "#3AE091",
] as const;

export type RetinaSquareColor = (typeof RETINA_SQUARE_COLORS)[number];
export type RetinaCircleColor = (typeof RETINA_CIRCLE_COLORS)[number];
export type RetinaTriangleColor = (typeof RETINA_TRIANGLE_COLORS)[number];
export type RetinaColor =
  | RetinaSquareColor
  | RetinaCircleColor
  | RetinaTriangleColor;

export interface RetinaVariation {
  shape: RetinaShape;
  color: RetinaColor;
}

/** Test sırası: kare → daire → üçgen */
export const RETINA_SHAPE_SEQUENCE = [
  "square",
  "circle",
  "triangle",
] as const satisfies readonly RetinaShape[];

const ACTIVE_SHAPES: RetinaShape[] = [...RETINA_SHAPE_SEQUENCE];

/** Figma: tepe yukarı, taban altta — reveal anchor ile uyumlu */
export const RETINA_TRIANGLE_CLIP = "polygon(50% 0%, 100% 100%, 0% 100%)";

/**
 * Reveal meet — sağ şeklin x ofseti = leftW - overlap.
 * Kare: kenar kenara (0). Daire/üçgen: Figma 190–192 gibi bindirme.
 */
export const RETINA_REVEAL_OVERLAP_RATIO: Record<RetinaShape, number> = {
  square: 0,
  circle: 0.52,
  /** Üçgen — tepe yüksekliği kıyası için daha fazla bindirme */
  triangle: 0.68,
};

export function getRevealMeetOverlap(
  shape: RetinaShape,
  leftW: number,
  rightW: number,
): number {
  const ratio = RETINA_REVEAL_OVERLAP_RATIO[shape];
  if (ratio <= 0) return 0;
  return Math.round(Math.min(leftW, rightW) * ratio);
}

export interface PickRetinaVariationOptions {
  /** Test: 0=kare, 1=daire, 2=üçgen … */
  sequenceIndex?: number;
}

function pickFrom<T extends readonly string[]>(pool: T): T[number] {
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? pool[0];
}

function pickColorForShape(shape: RetinaShape): RetinaColor {
  switch (shape) {
    case "circle":
      return pickFrom(RETINA_CIRCLE_COLORS);
    case "triangle":
      return pickFrom(RETINA_TRIANGLE_COLORS);
    default:
      return pickFrom(RETINA_SQUARE_COLORS);
  }
}

function pickRandomShape(): RetinaShape {
  const forced = process.env.NEXT_PUBLIC_RETINA_SHAPE;
  if (forced === "square" || forced === "circle" || forced === "triangle") {
    return forced;
  }
  return pickFrom(ACTIVE_SHAPES);
}

export function pickRetinaVariation(
  options?: PickRetinaVariationOptions,
): RetinaVariation {
  const shape =
    options?.sequenceIndex !== undefined
      ? RETINA_SHAPE_SEQUENCE[
          options.sequenceIndex % RETINA_SHAPE_SEQUENCE.length
        ]!
      : pickRandomShape();

  return { shape, color: pickColorForShape(shape) };
}

/** @deprecated pickRetinaVariation kullanın */
export function pickRetinaSquareColor(): RetinaSquareColor {
  return pickFrom(RETINA_SQUARE_COLORS);
}

export function getRetinaShapeLabel(shape: RetinaShape): string {
  switch (shape) {
    case "circle":
      return "daire";
    case "triangle":
      return "üçgen";
    default:
      return "kare";
  }
}

export function getRetinaShapeStyle(
  shape: RetinaShape,
  color: string,
  size: number,
): CSSProperties {
  const base: CSSProperties = {
    width: size,
    height: size,
    backgroundColor: color,
    border: "none",
    padding: 0,
  };

  if (shape === "circle") {
    return { ...base, borderRadius: "50%" };
  }

  if (shape === "triangle") {
    return {
      ...base,
      clipPath: RETINA_TRIANGLE_CLIP,
      WebkitClipPath: RETINA_TRIANGLE_CLIP,
    };
  }

  return base;
}
