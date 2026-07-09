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

/** Kapalı + kol uzunluğu — SVG merkez kolu ile açık bracket kolu aynı kalır */
const WHY_BRACKET_THICK = 1;
const WHY_BRACKET_ARM = Math.round(WHY_BRACKET_SIZE / 2);
/** Bracket kolları border stroke üzerine oturur */
const BRACKET_REST_OFFSET = WHY_BRACKET_ARM - WHY_BRACKET_THICK;
const PANEL_EASE = "power2.inOut";

const TL_OPEN_LEFT = -BRACKET_REST_OFFSET;
const TL_OPEN_TOP = -BRACKET_REST_OFFSET;

function brOpenLeft(boxW: number) {
  return boxW - WHY_BRACKET_THICK;
}

function brOpenTop(boxH: number) {
  return boxH - WHY_BRACKET_THICK;
}

function closedBracketPositions(boxW: number, boxH: number) {
  const cx = boxW / 2;
  const cy = boxH / 2;
  return {
    tlLeft: cx - WHY_BRACKET_ARM,
    tlTop: cy - WHY_BRACKET_ARM,
    brLeft: cx,
    brTop: cy,
  };
}

function snapOpenBrackets(
  tlEl: HTMLElement,
  brEl: HTMLElement,
  boxWrap: HTMLElement,
  boxW: number,
  boxH: number,
) {
  gsap.set(tlEl, { left: TL_OPEN_LEFT, top: TL_OPEN_TOP });
  gsap.set(brEl, { left: brOpenLeft(boxW), top: brOpenTop(boxH) });
  gsap.set(boxWrap, { scale: 1 });
}

export function WhyPanel() {
  const { view, closeWhy, lockRef } = useSiteMenu();
  const active = view === "why";

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const plusRef = useRef<SVGSVGElement>(null);
  const bracketTLRef = useRef<HTMLDivElement>(null);
  const bracketBRRef = useRef<HTMLDivElement>(null);
  const boxWrapRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const settledRef = useRef(false);
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
    const boxWrap = boxWrapRef.current;
    const back = backRef.current;
    if (!plus || !tlEl || !brEl || !boxWrap || !back) return;

    tlRef.current?.kill();
    settledRef.current = false;

    const { w, h } = readBoxSize();
    const closed = closedBracketPositions(w, h);

    gsap.set(rootRef.current, { pointerEvents: "auto", opacity: 1 });
    gsap.set(plus, { opacity: 1 });

    gsap.set(tlEl, {
      left: closed.tlLeft,
      top: closed.tlTop,
      opacity: 0,
    });
    gsap.set(brEl, {
      left: closed.brLeft,
      top: closed.brTop,
      opacity: 0,
    });

    gsap.set(boxWrap, {
      scale: 0,
      transformOrigin: "center center",
    });
    gsap.set(back, { opacity: 0, pointerEvents: "none" });

    const tl = gsap.timeline({
      onComplete: () => {
        settledRef.current = true;
        snapOpenBrackets(tlEl, brEl, boxWrap, w, h);
      },
    });
    tlRef.current = tl;

    tl.to({}, { duration: WHY_PLUS_HOLD });

    const openAt = WHY_PLUS_HOLD;

    tl.set(plus, { opacity: 0 }, openAt);
    tl.set(tlEl, { opacity: 1 }, openAt);
    tl.set(brEl, { opacity: 1 }, openAt);

    tl.to(
      tlEl,
      {
        left: TL_OPEN_LEFT,
        top: TL_OPEN_TOP,
        duration: WHY_PANEL_DURATION,
        ease: PANEL_EASE,
        roundProps: "left,top",
      },
      openAt,
    );
    tl.to(
      brEl,
      {
        left: brOpenLeft(w),
        top: brOpenTop(h),
        duration: WHY_PANEL_DURATION,
        ease: PANEL_EASE,
        roundProps: "left,top",
      },
      openAt,
    );
    tl.to(
      boxWrap,
      {
        scale: 1,
        duration: WHY_PANEL_DURATION,
        ease: PANEL_EASE,
      },
      openAt,
    );
    tl.to(
      back,
      {
        opacity: 1,
        duration: 0.35,
        ease: "power2.out",
        onComplete: () => {
          gsap.set(back, { pointerEvents: "auto" });
        },
      },
      openAt + WHY_PANEL_DURATION - 0.12,
    );
  }, []);

  const runExit = useCallback(
    (onDone: () => void) => {
      const plus = plusRef.current;
      const tlEl = bracketTLRef.current;
      const brEl = bracketBRRef.current;
      const boxWrap = boxWrapRef.current;
      const back = backRef.current;
      if (!plus || !tlEl || !brEl || !boxWrap || !back) {
        onDone();
        return;
      }

      tlRef.current?.kill();
      lockRef.current = true;
      settledRef.current = false;
      gsap.set(back, { pointerEvents: "none" });

      const closeDur = WHY_PANEL_DURATION;
      const { w, h } = readBoxSize();
      const closed = closedBracketPositions(w, h);

      const tl = gsap.timeline({
        onComplete: () => {
          lockRef.current = false;
          onDone();
        },
      });
      tlRef.current = tl;

      tl.to(back, { opacity: 0, duration: 0.2 });
      tl.to(boxWrap, { scale: 0, duration: closeDur, ease: PANEL_EASE }, 0.08);
      tl.to(
        tlEl,
        {
          left: closed.tlLeft,
          top: closed.tlTop,
          duration: closeDur,
          ease: PANEL_EASE,
          roundProps: "left,top",
        },
        0.08,
      );
      tl.to(
        brEl,
        {
          left: closed.brLeft,
          top: closed.brTop,
          duration: closeDur,
          ease: PANEL_EASE,
          roundProps: "left,top",
        },
        0.08,
      );
      tl.to([tlEl, brEl], { opacity: 0, duration: 0.12 }, closeDur);
      tl.to(plus, { opacity: 1, duration: 0.18 }, closeDur);
      tl.to({}, { duration: 0.15 });
    },
    [lockRef],
  );

  useLayoutEffect(() => {
    if (!active) {
      settledRef.current = false;
      gsap.set(rootRef.current, { pointerEvents: "none", opacity: 0 });
      return;
    }
    runEnter();
    return () => {
      tlRef.current?.kill();
    };
  }, [active, runEnter]);

  // Yeniden boyutlanınca animasyonu tekrar oynatma — sadece açık konuma snap
  useEffect(() => {
    if (!active || !settledRef.current) return;
    const tlEl = bracketTLRef.current;
    const brEl = bracketBRRef.current;
    const boxWrap = boxWrapRef.current;
    if (!tlEl || !brEl || !boxWrap) return;
    snapOpenBrackets(tlEl, brEl, boxWrap, boxSize.w, boxSize.h);
  }, [active, boxSize.w, boxSize.h]);

  const handleBack = () => {
    runExit(() => closeWhy());
  };

  const plusHalf = WHY_BRACKET_SIZE / 2;

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-0 overflow-hidden opacity-0"
      style={{ zIndex: 55 }}
      aria-hidden={!active}
    >
      <div
        ref={stageRef}
        className="absolute"
        style={{
          left: "50%",
          top: "50%",
          width: boxSize.w,
          height: boxSize.h,
          transform: "translate(-50%, -50%)",
        }}
      >
        {/* Kapalı + — merkezde sabit boyut */}
        <svg
          ref={plusRef}
          className="pointer-events-none absolute z-10"
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
          width={WHY_BRACKET_SIZE}
          height={WHY_BRACKET_SIZE}
          aria-hidden
        >
          <line
            x1={0}
            y1={plusHalf}
            x2={WHY_BRACKET_SIZE}
            y2={plusHalf}
            stroke={MENU_INK}
            strokeWidth={WHY_BRACKET_THICK}
          />
          <line
            x1={plusHalf}
            y1={0}
            x2={plusHalf}
            y2={WHY_BRACKET_SIZE}
            stroke={MENU_INK}
            strokeWidth={WHY_BRACKET_THICK}
          />
        </svg>

        {/* Sol-üst bracket — kol uzunluğu sabit */}
        <div
          ref={bracketTLRef}
          className="pointer-events-none absolute z-[5]"
          style={{
            width: WHY_BRACKET_ARM,
            height: WHY_BRACKET_ARM,
            opacity: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "100%",
              height: WHY_BRACKET_THICK,
              backgroundColor: MENU_INK,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: WHY_BRACKET_THICK,
              height: "100%",
              backgroundColor: MENU_INK,
            }}
          />
        </div>

        {/* Sağ-alt bracket — kol uzunluğu sabit */}
        <div
          ref={bracketBRRef}
          className="pointer-events-none absolute z-[5]"
          style={{
            width: WHY_BRACKET_ARM,
            height: WHY_BRACKET_ARM,
            opacity: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: WHY_BRACKET_THICK,
              backgroundColor: MENU_INK,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: WHY_BRACKET_THICK,
              height: "100%",
              backgroundColor: MENU_INK,
            }}
          />
        </div>

        <div
          ref={boxWrapRef}
          className="absolute inset-0"
          style={{ transformOrigin: "center center" }}
        >
          <div
            ref={boxRef}
            className="absolute inset-0 flex flex-col items-start justify-center overflow-hidden bg-black"
            style={{
              padding: "16px 16px 16px 43px",
            }}
          >
            <div
              className="why-panel-content whitespace-pre-wrap"
              style={{ width: boxSize.w - 59 }}
            >
              {WHY_TEXT}
            </div>
          </div>

          {/* Border — gradient kutusu gibi ayrı katman, bracket'lar buna hizalanır */}
          <div
            className="pointer-events-none absolute inset-0 z-1"
            style={{
              border: `${WHY_BRACKET_THICK}px solid ${MENU_INK}`,
              boxSizing: "border-box",
            }}
          />
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
