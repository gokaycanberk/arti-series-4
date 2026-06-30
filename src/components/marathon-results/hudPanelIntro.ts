import gsap from "gsap";

import { SHELL_CHROME_Z } from "@/lib/gameShellLayout";

/** Blur üstünde — MarathonResults (z-60) üzerinde */
export const HUD_PANEL_INTRO_Z = 70;

export interface HudPanelElements {
  hex: HTMLElement;
  score: HTMLElement;
}

export function getHudPanelElements(): HudPanelElements | null {
  const hex = document.getElementById("gs-hex-chip");
  const score = document.getElementById("gs-score-digits");
  if (!hex || !score) return null;
  return { hex, score };
}

/** Oyun sırasındaki gerçek HUD öğelerini blur üstüne taşır */
export function elevateHudPanel(): HudPanelElements | null {
  const els = getHudPanelElements();
  if (!els) return null;

  for (const el of [els.hex, els.score]) {
    const rect = el.getBoundingClientRect();
    gsap.set(el, {
      position: "fixed",
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      zIndex: HUD_PANEL_INTRO_Z,
      margin: 0,
      opacity: 1,
      scale: 1,
      y: 0,
      visibility: "visible",
      transformOrigin: "50% 50%",
    });
  }

  return els;
}

export function hideHudPanelElements(): void {
  const els = getHudPanelElements();
  if (!els) return;
  gsap.set([els.hex, els.score], {
    opacity: 0,
    visibility: "hidden",
    pointerEvents: "none",
  });
}

export function restoreHudPanelElements(): void {
  const els = getHudPanelElements();
  if (!els) return;
  gsap.set([els.hex, els.score], { clearProps: "all" });
  const panel = document.getElementById("gs-right-panel");
  if (panel) gsap.set(panel, { zIndex: SHELL_CHROME_Z });
}
