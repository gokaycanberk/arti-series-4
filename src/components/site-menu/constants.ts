export const MENU_INK = "#000000";

/** Figma Desktop-117 — sol menü öğeleri */
export const MENU_ITEMS = [
  { id: "home", label: "HOME", href: "/" as const, external: false },
  {
    id: "why",
    label: "WHY?",
    href: null,
    external: false,
  },
  {
    id: "who",
    label: "WHO?",
    href: "https://www.artistudyo.com/about",
    external: true,
  },
  {
    id: "contact",
    label: "CONTACT",
    href: "https://www.artistudyo.com/contact",
    external: true,
  },
] as const;

/** Figma 1920×1080 — dikey konumlar (px) */
export const MENU_ITEM_TOPS = [253, 452, 651, 850] as const;

export const MENU_FONT_SIZE = 190;
export const MENU_LEFT = 48;

export const MENU_BLUR_PX = 12;
export const MENU_BLUR_BG = "rgba(229, 229, 229, 0.68)";

export const MENU_ITEM_STAGGER = 0.12;
export const MENU_ITEM_ENTER_DURATION = 0.85;
/** WHY tıklanınca sola yavaş kayış */
export const MENU_ITEM_EXIT_DURATION = 1.35;

/** Why panel — Figma Desktop-116/118/3990 */
export const WHY_BOX_W = 991;
export const WHY_BOX_H = 433;
export const WHY_BRACKET_SIZE = 67;
/** + görünür kalma süresi (sn) */
export const WHY_PLUS_HOLD = 0.6;
/** Açılış ve kapanış aynı hız */
export const WHY_PANEL_DURATION = 1.1;
export const WHY_TEXT =
  "Gorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam eu turpis molestie, dictum est a, mattis tellus. Sed dignissim, metus nec fringilla accumsan, risus sem sollicitudin lacus, ut interdum t Aliquam in elementum tellus.\n\nCurabitur tempor quis eros tempus lacinia. Nam bibendum pellentesque quam a convallis. Sed ut vulputate nisi. Integer in felis sed leo vestibulum venenatis. Suspendisse quis arcu sem. Gorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam eu turpis molestie, dictum est a, mattis tellus. Sed dignissim,";

/** Toggle çizgileri — küçültülmüş, orijinal konumda */
export const TOGGLE_BAR_W = 46;
export const TOGGLE_BAR_H = 8;
export const TOGGLE_BAR_GAP = 5;
export const TOGGLE_HIT_SIZE = 46;

/** Why geri ok — toggle ile orantılı */
export const SITE_MENU_BACK_FONT_SIZE = 52;
export const SITE_MENU_BACK_WIDTH = Math.round(TOGGLE_BAR_W * 1.48);

/** Figma Desktop-117/118/126 — köşe chrome */
export const SITE_CORNER_INSET = 50;

/** Toggle sarmalayıcı — orijinal Figma konumu */
export const SITE_MENU_TOGGLE_TOP = 30;
export const SITE_MENU_TOGGLE_LEFT = SITE_CORNER_INSET;

/** Kapalı hamburger çizgileri — viewport tepesinden (orijinal Y) */
export const SITE_MENU_HAMBURGER_BAR1_TOP = SITE_CORNER_INSET;
export const SITE_MENU_HAMBURGER_BAR2_TOP =
  SITE_CORNER_INSET + TOGGLE_BAR_H + TOGGLE_BAR_GAP;

/** Açık + — orijinal Figma Y */
export const SITE_MENU_PLUS_CENTER_Y = 64;
export const SITE_MENU_PLUS_BAR_TOP = 58;

/** Geri ok — + ile aynı yatay eksen, sağ köşe */
export const SITE_MENU_BACK_TOP = SITE_MENU_PLUS_CENTER_Y;
export const SITE_MENU_BACK_RIGHT = SITE_CORNER_INSET;
