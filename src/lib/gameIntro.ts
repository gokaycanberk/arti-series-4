import gsap from "gsap";

/** Intro kartı boyutu — Figma 442:12 */
export const INTRO_CARD_WIDTH = 1100;
export const INTRO_CARD_HEIGHT = 500;

export const INTRO_HOLD = 2;
export const INTRO_ENTER_DURATION = 1.1;
export const INTRO_EXIT_DURATION = 1.0;
export const INTRO_PLAY_BUTTON_W = 132;
export const INTRO_PLAY_BUTTON_H = 56;
/** PressButton 3D gölge payı (DY + OY×2) */
export const INTRO_PLAY_BUTTON_SLOT_H = INTRO_PLAY_BUTTON_H + 24;

/** Logo ↔ açıklama ↔ PLAY arası dikey boşluk (açıklama–PLAY referans) */
export const INTRO_CARD_SECTION_GAP = "clamp(16px, 2.5vh, 28px)";

/** Logo görsel yüksekliği — PNG alt boşluğu kırpılır */
export const INTRO_CARD_LOGO_H = "clamp(64px, 10vh, 110px)";

export const GAME_REVEAL_DURATION = 1.45;
export const GAME_REVEAL_STAGGER = 0.28;

/** Oyun bazlı dikey ince ayar (px) */
export const INTRO_CARD_Y_OFFSET: Partial<Record<string, number>> = {
  "untitled-project": -56,
};

/** Intro kartı bitene kadar oyun UI gösterilmez */
export function introPendingPhase(phase: string): boolean {
  return phase === "waiting" || phase === "idle" || phase === "intro";
}

/** Maraton tekrarlarında intro kartını atla — yalnızca ilk etap (index 0) */
export function shouldSkipIntroCard(attemptIndex?: number): boolean {
  return attemptIndex !== undefined && attemptIndex > 0;
}

export type GameRevealTargets = {
  desc?: HTMLElement | null;
  board?: HTMLElement | null;
};

/** Mount sonrası ilk kare — flash önleme */
export function prepareGameContentHidden(targets: GameRevealTargets): void {
  const { desc, board } = targets;
  if (desc) {
    gsap.set(desc, {
      opacity: 0,
      x: -28,
      visibility: "visible",
      pointerEvents: "none",
    });
  }
  if (board) {
    gsap.set(board, {
      opacity: 0,
      y: 44,
      scale: 0.978,
      transformOrigin: "50% 55%",
      visibility: "visible",
    });
  }
}

/** Intro kartı indikten sonra sol kutu + oyun alanı — yumuşak giriş */
export function runGameContentReveal(
  targets: GameRevealTargets,
  onComplete?: () => void,
): gsap.core.Timeline {
  const { desc, board } = targets;

  const tl = gsap.timeline({
    onComplete: () => {
      if (desc) gsap.set(desc, { pointerEvents: "auto", clearProps: "x" });
      if (board) gsap.set(board, { clearProps: "y,scale" });
      onComplete?.();
    },
  });

  if (desc) {
    tl.to(
      desc,
      {
        opacity: 1,
        x: 0,
        duration: GAME_REVEAL_DURATION,
        ease: "power3.out",
      },
      0,
    );
  }
  if (board) {
    tl.to(
      board,
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: GAME_REVEAL_DURATION,
        ease: "power3.out",
      },
      desc ? GAME_REVEAL_STAGGER : 0,
    );
  }

  return tl;
}

/** Intro kartı yukarı kayarak girer — PLAY! bekler */
export function runIntroCardEnter(
  card: HTMLElement | null,
  onEntered?: () => void,
  options?: { skip?: boolean },
): gsap.core.Timeline {
  if (!card || options?.skip) {
    if (card) gsap.set(card, { opacity: 0, y: "100vh" });
    onEntered?.();
    return gsap.timeline();
  }

  return gsap.timeline({ onComplete: onEntered }).fromTo(
    card,
    { y: "100vh", opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: INTRO_ENTER_DURATION,
      ease: "power3.out",
    },
  );
}

/** PLAY! sonrası intro kartı aşağı kayarak çıkar */
export function runIntroCardExit(
  card: HTMLElement | null,
  onComplete: () => void,
): gsap.core.Timeline {
  if (!card) {
    onComplete();
    return gsap.timeline();
  }

  return gsap.timeline({ onComplete }).to(card, {
    y: "100vh",
    opacity: 0,
    duration: INTRO_EXIT_DURATION,
    ease: "power2.in",
  });
}

/** @deprecated Otomatik bekleme kaldırıldı — useGameIntroPlay kullanın */
export function runIntroCardTimeline(
  card: HTMLElement | null,
  onComplete: () => void,
  options?: { skip?: boolean },
): gsap.core.Timeline {
  if (!card || options?.skip) {
    if (card) gsap.set(card, { opacity: 0, y: "100vh" });
    onComplete();
    return gsap.timeline();
  }

  const tl = gsap.timeline();
  tl.add(runIntroCardEnter(card));
  tl.add(runIntroCardExit(card, onComplete));
  return tl;
}
