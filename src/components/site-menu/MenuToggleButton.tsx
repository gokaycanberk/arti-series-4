"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";

import {
  MENU_INK,
  SITE_MENU_HAMBURGER_BAR1_TOP,
  SITE_MENU_HAMBURGER_BAR2_TOP,
  SITE_MENU_PLUS_BAR_TOP,
  SITE_MENU_TOGGLE_TOP,
  TOGGLE_BAR_H,
  TOGGLE_BAR_W,
  TOGGLE_HIT_SIZE,
} from "./constants";

interface MenuToggleButtonProps {
  open: boolean;
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
}

/** Figma Desktop-117/118/126 — kapalı: iki çizgi @50px; açık: + @ y=64 */
export function MenuToggleButton({
  open,
  onClick,
  className = "",
  style,
  "aria-label": ariaLabel = "Menu",
}: MenuToggleButtonProps) {
  const barHRef = useRef<HTMLSpanElement>(null);
  const barVRef = useRef<HTMLSpanElement>(null);

  const barW = TOGGLE_BAR_W;
  const barH = TOGGLE_BAR_H;
  const hitSize = TOGGLE_HIT_SIZE;

  const closedBar1Top = SITE_MENU_HAMBURGER_BAR1_TOP - SITE_MENU_TOGGLE_TOP;
  const closedBar2Top = SITE_MENU_HAMBURGER_BAR2_TOP - SITE_MENU_TOGGLE_TOP;
  const openBarTop = SITE_MENU_PLUS_BAR_TOP - SITE_MENU_TOGGLE_TOP;

  useEffect(() => {
    const horizontal = barHRef.current;
    const vertical = barVRef.current;
    if (!horizontal || !vertical) return;

    if (open) {
      gsap.to(horizontal, {
        top: openBarTop,
        left: 0,
        rotation: 0,
        duration: 0.4,
        ease: "power2.out",
      });
      gsap.to(vertical, {
        top: openBarTop,
        left: 0,
        rotation: 90,
        duration: 0.4,
        ease: "power2.out",
      });
    } else {
      gsap.to(horizontal, {
        top: closedBar1Top,
        left: 0,
        rotation: 0,
        duration: 0.4,
        ease: "power2.out",
      });
      gsap.to(vertical, {
        top: closedBar2Top,
        left: 0,
        rotation: 0,
        duration: 0.4,
        ease: "power2.out",
      });
    }
  }, [open, closedBar1Top, closedBar2Top, openBarTop]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? "Close menu" : ariaLabel}
      aria-expanded={open}
      className={`cursor-pointer border-0 bg-transparent p-0 ${className}`}
      style={{
        position: "relative",
        width: hitSize,
        height: hitSize,
        ...style,
      }}
    >
      <span
        ref={barHRef}
        className="absolute block origin-center"
        style={{
          top: closedBar1Top,
          left: 0,
          width: barW,
          height: barH,
          backgroundColor: MENU_INK,
        }}
      />
      <span
        ref={barVRef}
        className="absolute block origin-center"
        style={{
          top: closedBar2Top,
          left: 0,
          width: barW,
          height: barH,
          backgroundColor: MENU_INK,
        }}
      />
    </button>
  );
}
