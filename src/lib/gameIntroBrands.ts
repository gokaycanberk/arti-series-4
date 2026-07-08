/** Oyun intro overlay — game_logos_2 + kart dolgu rengi (Figma 442:12) */

export interface GameIntroBrand {
  logoSrc: string;
  /** SVG kart dolgu rengi */
  fillColor: string;
}

export const GAME_INTRO_BRANDS: Record<string, GameIntroBrand> = {
  "optical-panic": {
    logoSrc: "/game_logos_2/optical_panic_logo2.png",
    fillColor: "#FF3355",
  },
  "retina-check": {
    logoSrc: "/game_logos_2/retina_check_logo2.png",
    fillColor: "#FF9869",
  },
  "bezier-brain": {
    logoSrc: "/game_logos_2/bezier_brain_logo_2.png",
    fillColor: "#FFD52E",
  },
  "gradient-guru": {
    logoSrc: "/game_logos_2/gradient_guru_logo2.png",
    fillColor: "#9255D4",
  },
  "untitled-project": {
    logoSrc: "/game_logos_2/untitled1_logo_2.png",
    fillColor: "#3AE091",
  },
};

export function getGameIntroBrand(gameId: string): GameIntroBrand | null {
  return GAME_INTRO_BRANDS[gameId] ?? null;
}
