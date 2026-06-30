/** Figma canvas — Desktop frames (1920×1080) */
export const DESIGN_W = 1920;
export const DESIGN_H = 1080;

/** Ellipse14 — node 80:2547 */
export const BADGE_PX = 693;

export const PLAYER_CARD_W = 598;
export const PLAYER_CARD_H = 147;
/** border-box iç alan: 596 = 298 + 298 */
export const PLAYER_CARD_LEFT_W = 298;
export const PLAYER_CARD_RIGHT_W = 298;
export const PLAYER_CARD_TOP_H = 72;
export const PLAYER_CARD_BOTTOM_H = 73;

export const PLAYER_AVATAR_PX = 99.379;

/** Skor kartı halka merkezinde — Figma Group 42 */
export const CARD_OFFSET_X = (BADGE_PX - PLAYER_CARD_W) / 2;
export const CARD_OFFSET_Y = BADGE_PX / 2 - PLAYER_CARD_H / 2;

/** Skorboard: header 56 + 10 satır × 34 */
export const SCOREBOARD_HEADER_H = 56;
export const SCOREBOARD_ROW_H = 34;
export const SCOREBOARD_ROWS = 10;
export const SCOREBOARD_H =
  SCOREBOARD_HEADER_H + SCOREBOARD_ROWS * SCOREBOARD_ROW_H;

/** Skorboard ↔ oyuncu kartı arası (tasarım px, scale ile çarpılır) */
export const STACK_GAP_PX = 50;
export const SCOREBOARD_CARD_GAP = STACK_GAP_PX;

/** Skorboard + boşluk + oyuncu kartı */
export const RESULTS_STACK_H =
  SCOREBOARD_H + SCOREBOARD_CARD_GAP + PLAYER_CARD_H;
export const RESULTS_STACK_W = PLAYER_CARD_W;

/** Butonlar sabit kalır — skorboard üstü 20px yukarı (200→180) */
export const RESULTS_STACK_LIFT = 20;

export const INTRO_Y = 67;
export const CARD_DROP = 140;

/** Figma 80:2570 — HUD hex kutusu (1920×1080) */
export const INTRO_HEX_HUD_X_RATIO = 2 / 3;
export const INTRO_HEX_HUD_X_OFFSET = 19;
export const INTRO_HEX_HUD_Y = 329;
export const INTRO_HEX_HUD_W = 196;
export const INTRO_HEX_HUD_H = 34;
export const INTRO_HEX_HUD_FONT = 20;

/** Kart hex hücresi */
export const INTRO_HEX_CARD_FONT = 35;

/** Giriş animasyon süreleri (saniye) */
export const INTRO_BLUR_DURATION = 1.5;
export const INTRO_HUD_EXIT_START = 2.0;
export const INTRO_HUD_EXIT_DURATION = 1.0;
export const INTRO_CARD_IN_START = 2.7;
export const INTRO_CARD_IN_DURATION = 1.3;
export const INTRO_BADGE_START = 4.2;

export const BUTTON_HEIGHT = 77;
export const BUTTONS_BOTTOM = 32;

/** Skorboard üst boşluk — Figma 80:1307 y=214 @ 1080, lift düşülür */
export const RESULTS_TOP_PX = 180;

/** Kart altı → buton üstü (ekran px, scale ile çarpılır) */
export const CARD_BUTTON_GAP = STACK_GAP_PX;

/** Alt butonlar + kart arası için viewport payı */
export const BUTTONS_RESERVE =
  BUTTONS_BOTTOM + BUTTON_HEIGHT + CARD_BUTTON_GAP;

/** Figma koordinatını viewport pikseline çevir */
export function figmaYToViewport(figmaY: number, viewportH: number): number {
  return (figmaY / DESIGN_H) * viewportH;
}

export function figmaXToViewport(figmaX: number, viewportW: number): number {
  return (figmaX / DESIGN_W) * viewportW;
}

/**
 * Oyuncu kartının üst kenarı (ekran px).
 * Kart altı ↔ buton üstü = STACK_GAP_PX × scale.
 */
export function getPlayerCardTop(
  viewportH: number,
  scale: number,
): number {
  const gap = STACK_GAP_PX * scale;
  const cardBottom = viewportH - BUTTONS_BOTTOM - BUTTON_HEIGHT - gap;
  return cardBottom - PLAYER_CARD_H * scale;
}

/**
 * Skorboard bloğunu viewport'a sığdır.
 * Üst (Figma) + alt (butonlar) payları düşülür.
 */
export function getDesignScale(viewportW: number, viewportH: number): number {
  const pad = 48;
  const topReserve = figmaYToViewport(RESULTS_TOP_PX, viewportH);
  const availableW = viewportW - pad;
  const availableH = viewportH - topReserve - BUTTONS_RESERVE - pad;
  return Math.min(
    1,
    availableW / RESULTS_STACK_W,
    availableH / RESULTS_STACK_H,
  );
}
