/** Figma Desktop-75 shell ölçüleri */

/** İlerleme çubuğu yatay kenar boşluğu */
export const SHELL_BAR_INSET_X = 49;

/** Sol açıklama kutusu + sağ skor paneli yatay kenar boşluğu */
export const SHELL_PANEL_INSET_X = 50;

/** Sol açıklama kutusu genişliği — Figma */
export const DESC_BOX_WIDTH = 222;

/** Oyun chrome çizgi kalınlığı — PressButton / ArrowKeycap ile aynı */
export const SHELL_INK = "#1A1A1A";
export const SHELL_STROKE_WIDTH = 1.5;
export const SHELL_STROKE = `${SHELL_STROKE_WIDTH}px solid ${SHELL_INK}`;

/** İlerleme çubuğu üst kenarı — viewport tepesinden (px) */
export const SHELL_PROGRESS_TOP = 108;

/** İlerleme çubuğu yüksekliği */
export const SHELL_PROGRESS_HEIGHT = 12;

/** Üst header yüksekliği — progress bar alt kenarına kadar */
export const SHELL_HEADER_HEIGHT = SHELL_PROGRESS_TOP + SHELL_PROGRESS_HEIGHT;

/** İlerleme çubuğu altından panele dikey mesafe */
export const SHELL_PANEL_TOP = 40;

/** Logo placeholder — Figma */
export const SHELL_LOGO_TOP = 16;
export const SHELL_LOGO_WIDTH = 224;
export const SHELL_LOGO_HEIGHT = 64;

/** Avatar + bar sarmalayıcı — bar üst kenarı SHELL_PROGRESS_TOP'ta */
export const SHELL_PROGRESS_AVATAR_SIZE = 42;
export const SHELL_PROGRESS_WRAP_TOP =
  SHELL_PROGRESS_TOP - (SHELL_PROGRESS_AVATAR_SIZE - SHELL_PROGRESS_HEIGHT) / 2;

/** Hamburger menü — viewport sol/tepe (SiteMenuOverlay toggle ile paylaşılır) */
export const SHELL_MENU_TOP = 30;

/** Hamburger çizgi boyutu */
export const SHELL_MENU_WIDTH = 46;
export const SHELL_MENU_BAR_HEIGHT = 8;
export const SHELL_MENU_BAR_GAP = 5;

/** Sağ skor paneli genişliği */
export const SHELL_SCORE_PANEL_WIDTH = 196;

/** Skor / HEX / timer satır yüksekliği — üç kutu aynı */
export const SHELL_SCORE_PANEL_ROW_HEIGHT = 40;

/** Skor paneli tipografi */
export const SHELL_SCORE_FONT_SIZE = 16;

/** Skor kutuları arası dikey boşluk */
export const SHELL_SCORE_PANEL_GAP = 16;

/** İki ok tuşu arası boşluk — DESC_BOX_WIDTH ile hizalı */
export const ARROW_KEYCAP_GAP = 8;

/** ArrowKeycap SVG dış boşluğu — görünür tuş kenarı ile SVG kenarı arası */
export const ARROW_KEYCAP_EDGE_PAD = 8;

/** ArrowKeycap 3D derinlik ofseti (DX) */
export const ARROW_KEYCAP_DEPTH = 5;

/** Gövde genişliği — kırpılmış SVG'ler + gap = DESC_BOX_WIDTH */
export const ARROW_KEYCAP_BODY_W =
  (DESC_BOX_WIDTH -
    ARROW_KEYCAP_GAP -
    (ARROW_KEYCAP_DEPTH + ARROW_KEYCAP_EDGE_PAD) * 2) /
  2;

/** ArrowKeycap gövde yüksekliği — 2:1 oran */
export const ARROW_KEYCAP_BODY_H = Math.round(ARROW_KEYCAP_BODY_W / 2);

/** Shell chrome (açıklama + skor) — oyun popup'larının üstünde */
export const SHELL_CHROME_Z = 20;

/** Oyun içeriği katmanı */
export const SHELL_GAME_Z = 0;

/** Sağ skor paneli yığın yüksekliği (HEX + rakamlar + timer) */
export const SHELL_SCORE_PANEL_STACK_H =
  SHELL_SCORE_PANEL_ROW_HEIGHT * 3 + SHELL_SCORE_PANEL_GAP * 2;

/**
 * Oyun içeriği (Illustrator çubuğu + sekmeler) — shell chrome altından başlar.
 * Skor paneli yığını + ekstra boşluk.
 */
export const SHELL_GAME_TOP_OFFSET =
  SHELL_PANEL_TOP + SHELL_SCORE_PANEL_STACK_H + 36;

/**
 * Oyun alanında sekmeler / popup'lar için güvenli iç boşluk —
 * sol açıklama ve sağ skor panelinin yatay altında kalır.
 */
export const SHELL_GAME_SAFE_INSET = {
  top: 12,
  left: SHELL_PANEL_INSET_X + 200,
  right: SHELL_PANEL_INSET_X + SHELL_SCORE_PANEL_WIDTH + 24,
  bottom: 80,
} as const;
