"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
} from "react";

import {
  KEYCAP_BG,
  KEYCAP_INK,
  keycapOutlineD,
  keycapPoints,
  keycapPolygonPts,
} from "@/lib/isoKeycap";
import { useKeycapPress } from "@/lib/useKeycapPress";

export interface DoneKeycapHandle {
  press: () => void;
  release: () => void;
}

interface DoneKeycapProps {
  onPress?: () => void;
  className?: string;
  disabled?: boolean;
  /** Bırakınca basılı (siyah) görünümde kal — DONE akışı */
  holdAfterPress?: boolean;
}

/** Figma Done butonu — 166×66 */
const W = 160;
const H = 60;
const DX = 5;
const DY = 5;
const OX = 0.5;
const OY = 0.5;
const SVG_W = 166;
const SVG_H = 66;

const DoneKeycap = forwardRef<DoneKeycapHandle, DoneKeycapProps>(
  function DoneKeycap(
    { onPress, className = "", disabled = false, holdAfterPress = true },
    ref,
  ) {
    const uid = useId().replace(/:/g, "");
    const svgRef = useRef<SVGSVGElement>(null);

    const idRight = `dk-right-${uid}`;
    const idBottom = `dk-bottom-${uid}`;
    const idTop = `dk-top-${uid}`;
    const idOutline = `dk-outline-${uid}`;
    const idLabel = `dk-label-${uid}`;

    const draw = useCallback(
      (p: number) => {
        const svg = svgRef.current;
        if (!svg) return;

        const { fTR, fBR, fBL, tl, tr, br, bl, pressed } = keycapPoints(
          W,
          H,
          DX,
          DY,
          OX,
          OY,
          p,
        );

        svg.querySelector(`#${idRight}`)!.setAttribute(
          "points",
          keycapPolygonPts([tr, fTR, fBR, br]),
        );
        svg.querySelector(`#${idBottom}`)!.setAttribute(
          "points",
          keycapPolygonPts([bl, fBL, fBR, br]),
        );
        svg.querySelector(`#${idTop}`)!.setAttribute(
          "points",
          keycapPolygonPts([tl, tr, br, bl]),
        );
        svg.querySelector(`#${idTop}`)!.setAttribute("fill", pressed ? KEYCAP_INK : KEYCAP_BG);

        svg
          .querySelector(`#${idOutline}`)!
          .setAttribute("d", keycapOutlineD(tl, tr, br, bl, fTR, fBR, fBL));

        const textEl = svg.querySelector(`#${idLabel}`) as SVGTextElement | null;
        if (textEl) {
          textEl.setAttribute("fill", pressed ? KEYCAP_BG : KEYCAP_INK);
          textEl.setAttribute("x", String(OX + DX * p + W / 2));
          textEl.setAttribute("y", String(OY + DY * p + H / 2));
        }
      },
      [idBottom, idLabel, idOutline, idRight, idTop],
    );

    const { press, release, reset, cancelAnim, targetRef, latchedRef } =
      useKeycapPress({
        draw,
        onActivate: onPress,
        holdAfterPress,
        disabled,
      });

    useImperativeHandle(ref, () => ({ press, release }), [press, release]);

    useEffect(() => {
      if (disabled) return;
      reset();
    }, [disabled, reset]);

    useEffect(() => {
      draw(0);

      const handleUp = () => {
        if (targetRef.current === 1) release();
      };

      document.addEventListener("mouseup", handleUp);
      document.addEventListener("touchend", handleUp);

      return () => {
        document.removeEventListener("mouseup", handleUp);
        document.removeEventListener("touchend", handleUp);
        cancelAnim();
      };
    }, [cancelAnim, draw, release, targetRef]);

    const handleDown = () => {
      if (disabled || latchedRef.current) return;
      press();
    };

    return (
      <div className={`inline-flex ${className}`}>
        <svg
          ref={svgRef}
          width={SVG_W}
          height={SVG_H}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            cursor: disabled ? "default" : "pointer",
            display: "block",
            overflow: "visible",
          }}
          role="button"
          aria-label="Done"
          aria-disabled={disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            handleDown();
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            handleDown();
          }}
        >
          <polygon id={idRight} fill={KEYCAP_BG} stroke="none" />
          <polygon id={idBottom} fill={KEYCAP_BG} stroke="none" />
          <polygon id={idTop} fill={KEYCAP_BG} stroke="none" />
          <path
            id={idOutline}
            fill="none"
            stroke={KEYCAP_INK}
            strokeWidth="1"
            strokeLinejoin="miter"
            strokeLinecap="butt"
          />
          <text
            id={idLabel}
            textAnchor="middle"
            dominantBaseline="central"
            fill={KEYCAP_INK}
            style={{
              fontFamily: "var(--font-planc), serif",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "0.02em",
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            DONE!
          </text>
        </svg>
      </div>
    );
  },
);

export default DoneKeycap;
