/** Paylaşılan izometrik tuş çizimi — PressButton / ArrowKeycap / DoneKeycap */

export const KEYCAP_BG = "#E5E5E5";
export const KEYCAP_INK = "#1A1A1A";
export const KEYCAP_PRESS_LERP = 0.14;

export type KeycapPoint = { x: number; y: number };

export function keycapLerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function keycapPoints(
  w: number,
  h: number,
  dx: number,
  dy: number,
  ox: number,
  oy: number,
  p: number,
) {
  const fTR = { x: ox + w + dx, y: oy + dy };
  const fBR = { x: ox + w + dx, y: oy + h + dy };
  const fBL = { x: ox + dx, y: oy + h + dy };

  const faceX = ox + dx * p;
  const faceY = oy + dy * p;
  const tl = { x: faceX, y: faceY };
  const tr = { x: faceX + w, y: faceY };
  const br = { x: faceX + w, y: faceY + h };
  const bl = { x: faceX, y: faceY + h };

  return { fTR, fBR, fBL, tl, tr, br, bl, pressed: p > 0.5 };
}

export function keycapPolygonPts(points: KeycapPoint[]) {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

export function keycapOutlineD(
  tl: KeycapPoint,
  tr: KeycapPoint,
  br: KeycapPoint,
  bl: KeycapPoint,
  fTR: KeycapPoint,
  fBR: KeycapPoint,
  fBL: KeycapPoint,
) {
  return [
    `M${tl.x},${tl.y} L${tr.x},${tr.y} L${fTR.x},${fTR.y} L${fBR.x},${fBR.y} L${fBL.x},${fBL.y} L${bl.x},${bl.y} Z`,
    `M${tr.x},${tr.y} L${br.x},${br.y}`,
    `M${br.x},${br.y} L${bl.x},${bl.y}`,
    `M${br.x},${br.y} L${fBR.x},${fBR.y}`,
    `M${bl.x},${bl.y} L${fBL.x},${fBL.y}`,
  ].join(" ");
}
