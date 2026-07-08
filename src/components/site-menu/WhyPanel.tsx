"use client";

import gsap from "gsap";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  MENU_INK,
  SITE_MENU_BACK_FONT_SIZE,
  SITE_MENU_BACK_RIGHT,
  SITE_MENU_BACK_TOP,
  SITE_MENU_BACK_WIDTH,
  WHY_BOX_H,
  WHY_BOX_W,
  WHY_BRACKET_SIZE,
  WHY_PANEL_DURATION,
  WHY_PLUS_HOLD,
  WHY_TEXT,
} from "./constants";
import { useSiteMenu } from "./SiteMenuContext";

function readBoxSize() {
  if (typeof window === "undefined") {
    return { w: WHY_BOX_W, h: WHY_BOX_H };
  }
  return {
    w: Math.min(WHY_BOX_W, Math.round(window.innerWidth * 0.92)),
    h: Math.min(WHY_BOX_H, Math.round(window.innerHeight * 0.55)),
  };
}

/** Gradient Guru ile aynı: TL bracket sol-üst, BR bracket merkez — birlikte + oluşturur */
const PLUS_TL_LEFT = `calc(50% - ${WHY_BRACKET_SIZE}px)`;
const PLUS_TL_TOP = `calc(50% - ${WHY_BRACKET_SIZE}px)`;
const PLUS_BR_LEFT = "50%";
const PLUS_BR_TOP = "50%";

export function WhyPanel() {
  const { view, closeWhy, lockRef } = useSiteMenu();
  const active = view === "why";

  const rootRef = useRef<HTMLDivElement>(null);
  const plusRef = useRef<SVGSVGElement>(null);
  const bracketTLRef = useRef<HTMLDivElement>(null);
  const bracketBRRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const [boxSize, setBoxSize] = useState(readBoxSize);

  useEffect(() => {
    const onResize = () => setBoxSize(readBoxSize());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const runEnter = useCallback(() => {
    const plus = plusRef.current;
    const tlEl = bracketTLRef.current;
    const brEl = bracketBRRef.current;
    const box = boxRef.current;
    const back = backRef.current;
    if (!plus || !tlEl || !brEl || !box || !back) return;

    tlRef.current?.kill();

    const { w, h } = readBoxSize();
    const halfW = w / 2;
    const halfH = h / 2;

    gsap.set(rootRef.current, { pointerEvents: "auto", opacity: 1 });
    gsap.set(plus, { opacity: 1 });

    gsap.set(tlEl, {
      left: PLUS_TL_LEFT,
      top: PLUS_TL_TOP,
      opacity: 0,
    });
    gsap.set(brEl, {
      left: PLUS_BR_LEFT,
      top: PLUS_BR_TOP,
      opacity: 0,
    });

    gsap.set(box, {
      width: w,
      height: h,
      left: "50%",
      top: "50%",
      xPercent: -50,
      yPercent: -50,
      scale: 0,
      transformOrigin: "center center",
    });
    gsap.set(back, { opacity: 0, pointerEvents: "none" });

    const tl = gsap.timeline();
    tlRef.current = tl;

    tl.to({}, { duration: WHY_PLUS_HOLD });

    const openAt = WHY_PLUS_HOLD;

    // Beklemede yalnızca SVG +; genişleme başlarken bracket'lar devralır
    tl.set(plus, { opacity: 0 }, openAt);
    tl.set(tlEl, { opacity: 1 }, openAt);
    tl.set(brEl, { opacity: 1 }, openAt);

    tl.to(
      tlEl,
      {
        left: `calc(50% - ${halfW + WHY_BRACKET_SIZE}px)`,
        top: `calc(50% - ${halfH + WHY_BRACKET_SIZE}px)`,
        duration: WHY_PANEL_DURATION,
        ease: "power3.out",
      },
      openAt,
    );
    tl.to(
      brEl,
      {
        left: `calc(50% + ${halfW}px)`,
        top: `calc(50% + ${halfH}px)`,
        duration: WHY_PANEL_DURATION,
        ease: "power3.out",
      },
      openAt,
    );
    tl.to(
      box,
      {
        scale: 1,
        duration: WHY_PANEL_DURATION,
        ease: "power3.out",
      },
      openAt,
    );
    tl.to(
      back,
      {
        opacity: 1,
        duration: 0.45,
        ease: "power2.out",
        onComplete: () => {
          gsap.set(back, { pointerEvents: "auto" });
        },
      },
      openAt + WHY_PANEL_DURATION - 0.15,
    );
  }, []);

  const runExit = useCallback(
    (onDone: () => void) => {
      const plus = plusRef.current;
      const tlEl = bracketTLRef.current;
      const brEl = bracketBRRef.current;
      const box = boxRef.current;
      const back = backRef.current;
      if (!plus || !tlEl || !brEl || !box || !back) {
        onDone();
        return;
      }

      tlRef.current?.kill();
      lockRef.current = true;
      gsap.set(back, { pointerEvents: "none" });

      const closeDur = WHY_PANEL_DURATION;

      const tl = gsap.timeline({
        onComplete: () => {
          lockRef.current = false;
          onDone();
        },
      });
      tlRef.current = tl;

      tl.to(back, { opacity: 0, duration: 0.25 });
      tl.to(box, { scale: 0, duration: closeDur, ease: "power3.in" }, 0.1);
      tl.to(
        tlEl,
        {
          left: PLUS_TL_LEFT,
          top: PLUS_TL_TOP,
          duration: closeDur,
          ease: "power3.in",
        },
        0.1,
      );
      tl.to(
        brEl,
        {
          left: PLUS_BR_LEFT,
          top: PLUS_BR_TOP,
          duration: closeDur,
          ease: "power3.in",
        },
        0.1,
      );
      tl.to([tlEl, brEl], { opacity: 0, duration: 0.15 }, closeDur);
      tl.to(plus, { opacity: 1, duration: 0.2 }, closeDur);
      tl.to({}, { duration: 0.35 });
    },
    [lockRef],
  );

  useLayoutEffect(() => {
    if (!active) {
      gsap.set(rootRef.current, { pointerEvents: "none", opacity: 0 });
      return;
    }
    runEnter();
    return () => {
      tlRef.current?.kill();
    };
  }, [active, runEnter, boxSize.w, boxSize.h]);

  const handleBack = () => {
    runExit(() => closeWhy());
  };

  const half = WHY_BRACKET_SIZE / 2;

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-0 overflow-hidden opacity-0"
      style={{ zIndex: 55 }}
      aria-hidden={!active}
    >
      {/* Ortadaki + — Gradient Guru ile aynı */}
      <svg
        ref={plusRef}
        className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
        width={WHY_BRACKET_SIZE}
        height={WHY_BRACKET_SIZE}
        aria-hidden
      >
        <line
          x1={0}
          y1={half}
          x2={WHY_BRACKET_SIZE}
          y2={half}
          stroke={MENU_INK}
          strokeWidth={1}
        />
        <line
          x1={half}
          y1={0}
          x2={half}
          y2={WHY_BRACKET_SIZE}
          stroke={MENU_INK}
          strokeWidth={1}
        />
      </svg>

      <div
        ref={bracketTLRef}
        className="pointer-events-none absolute z-[5]"
        style={{
          width: WHY_BRACKET_SIZE,
          height: WHY_BRACKET_SIZE,
          opacity: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: 1,
            backgroundColor: MENU_INK,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 1,
            height: "100%",
            backgroundColor: MENU_INK,
          }}
        />
      </div>

      <div
        ref={bracketBRRef}
        className="pointer-events-none absolute z-[5]"
        style={{
          width: WHY_BRACKET_SIZE,
          height: WHY_BRACKET_SIZE,
          opacity: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 1,
            backgroundColor: MENU_INK,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1,
            height: "100%",
            backgroundColor: MENU_INK,
          }}
        />
      </div>

      <div
        ref={boxRef}
        className="absolute flex flex-col items-start justify-center overflow-hidden bg-black"
        style={{
          padding: "16px 16px 16px 43px",
          width: boxSize.w,
          height: boxSize.h,
        }}
      >
        <div
          className="why-panel-content whitespace-pre-wrap"
          style={{ width: boxSize.w - 59 }}
        >
          {WHY_TEXT}
        </div>
      </div>

      <button
        ref={backRef}
        type="button"
        onClick={handleBack}
        className="fixed cursor-pointer border-0 bg-transparent p-0 opacity-0"
        style={{
          top: SITE_MENU_BACK_TOP,
          right: SITE_MENU_BACK_RIGHT,
          width: SITE_MENU_BACK_WIDTH,
          transform: "translateY(-50%)",
          fontFamily: "var(--font-planc), Planc, sans-serif",
          fontSize: SITE_MENU_BACK_FONT_SIZE,
          fontWeight: 800,
          lineHeight: 1,
          color: MENU_INK,
          textAlign: "right",
        }}
        aria-label="Back to menu"
      >
        ←
      </button>
    </div>
  );
}
