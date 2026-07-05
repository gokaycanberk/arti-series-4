/** Figma Desktop-215 (425:121) — 1920×1080 referans */

const FIGMA_W = 1920;
const FIGMA_H = 1080;
/** Genel dikey hizalama — viewport / Figma farkı */
const FIGMA_Y_OFFSET = 110;

function figmaLeft(px: number): string {
  return `${(px / FIGMA_W) * 100}%`;
}

function figmaTop(px: number): string {
  return `${(((px + FIGMA_Y_OFFSET) / FIGMA_H) * 100).toFixed(3)}%`;
}

function figmaWidth(px: number): string {
  return `clamp(${Math.round(px * 0.45)}px, ${((px / FIGMA_W) * 100).toFixed(2)}vw, ${px}px)`;
}

export interface HomeGameLogoLayer {
  id: string;
  src: string;
  alt: string;
  /** Parallax derinliği (px) */
  depth: number;
  left: string;
  top: string;
  width: string;
  rotate: number;
}

/**
 * Ana sayfa — karşılama sonrası renkli layer konumları (game_logos_1).
 * Figma koordinatları + manuel ince ayar (tasarım karşılaştırması).
 */
export const HOME_GAME_LOGOS: readonly HomeGameLogoLayer[] = [
  {
    // 2 — Bezier Brain: sola çok kaçmış, sağa al
    id: "bezier-brain",
    src: "/game_logos_1/bezier_brain_logo.png",
    alt: "Bezier Brain",
    depth: 14,
    left: figmaLeft(-60),
    top: figmaTop(168),
    width: figmaWidth(542),
    rotate: 23.96,
  },
  {
    // 1 — Retina Check: biraz aşağı
    id: "retina-check",
    src: "/game_logos_1/retina_check_logo.png",
    alt: "Retina Check",
    depth: 16,
    left: figmaLeft(960 + 101),
    top: figmaTop(-100),
    width: figmaWidth(574),
    rotate: 32.93,
  },
  {
    // Optical Panic (kırmızı): aşağı
    id: "optical-panic",
    src: "/game_logos_1/optical_panic_logo.png",
    alt: "Optical Panic",
    depth: 18,
    left: figmaLeft(Math.round((FIGMA_W * 2) / 3) + 111),
    top: figmaTop(130),
    width: figmaWidth(828),
    rotate: -36.15,
  },
  {
    // 3 — Gradient Guru: aşağı
    id: "gradient-guru",
    src: "/game_logos_1/gradient_guru_logo.png",
    alt: "Gradient Guru",
    depth: 12,
    left: figmaLeft(Math.round((FIGMA_W * 1) / 12) + 72),
    top: figmaTop(610),
    width: figmaWidth(617),
    rotate: 45,
  },
  {
    // 4 — Untitled: aşağı
    id: "untitled",
    src: "/game_logos_1/untitled1_logo.png",
    alt: "Untitled Project",
    depth: 15,
    left: figmaLeft(960 + 8),
    top: figmaTop(720),
    width: figmaWidth(472),
    rotate: -53.79,
  },
];
