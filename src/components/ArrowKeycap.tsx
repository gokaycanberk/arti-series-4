"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  type CSSProperties,
} from "react";

export interface ArrowKeycapHandle {
  press: () => void;
  release: () => void;
}

interface ArrowKeycapProps {
  direction: "left" | "right";
  onPress?: () => void;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  keyWidth?: number;
  keyHeight?: number;
  /** Dış kenar SVG boşluğunu kırpar — sol/sağ tuş hizalaması için */
  edgeAlign?: "start" | "end";
}

const ArrowKeycap = forwardRef<ArrowKeycapHandle, ArrowKeycapProps>(
  function ArrowKeycap(
    { direction, onPress, className = "", style, ariaLabel, keyWidth = 64, keyHeight = 32, edgeAlign },
    ref,
  ) {
    const uid = useId().replace(/:/g, "");
    const svgRef = useRef<SVGSVGElement>(null);
    const progressRef = useRef(0);
    const targetRef = useRef(0);
    const rafRef = useRef<number | null>(null);

    const W = keyWidth;
    const H = keyHeight;

    const DX = 5;
    const DY = 5;
    const OX = 8;
    const OY = 8;
    const BG = "#e5e5e5";
    const INK = "#1a1a1a";

    const svgW =
      edgeAlign === "start" || edgeAlign === "end"
        ? W + DX + OX
        : W + DX + OX * 2;
    const svgH = H + DY + OY * 2;
    const viewBoxX = edgeAlign === "start" ? OX : 0;
    const idRight = `ak-right-${uid}`;
    const idBottom = `ak-bottom-${uid}`;
    const idTop = `ak-top-${uid}`;
    const idOutline = `ak-outline-${uid}`;
    const idShaft = `ak-shaft-${uid}`;
    const idHeadT = `ak-head-t-${uid}`;
    const idHeadB = `ak-head-b-${uid}`;

    const pts = (arr: { x: number; y: number }[]) =>
      arr.map((p) => `${p.x},${p.y}`).join(" ");

    const setLine = (
      lineId: string,
      x1: number,
      y1: number,
      x2: number,
      y2: number,
    ) => {
      const el = svgRef.current?.querySelector(`#${lineId}`);
      if (!el) return;
      el.setAttribute("x1", String(x1));
      el.setAttribute("y1", String(y1));
      el.setAttribute("x2", String(x2));
      el.setAttribute("y2", String(y2));
    };

    const draw = useCallback(
      (p: number) => {
        const svg = svgRef.current;
        if (!svg) return;

        const fTR = { x: OX + W + DX, y: OY + DY };
        const fBR = { x: OX + W + DX, y: OY + H + DY };
        const fBL = { x: OX + DX, y: OY + H + DY };

        const ox = OX + DX * p;
        const oy = OY + DY * p;
        const tl = { x: ox, y: oy };
        const tr = { x: ox + W, y: oy };
        const br = { x: ox + W, y: oy + H };
        const bl = { x: ox, y: oy + H };

        svg.querySelector(`#${idRight}`)!.setAttribute("points", pts([tr, fTR, fBR, br]));
        svg.querySelector(`#${idBottom}`)!.setAttribute("points", pts([bl, fBL, fBR, br]));
        svg.querySelector(`#${idTop}`)!.setAttribute("points", pts([tl, tr, br, bl]));
        svg.querySelector(`#${idTop}`)!.setAttribute("fill", p > 0.5 ? INK : BG);

        const d = [
          `M${tl.x},${tl.y} L${tr.x},${tr.y} L${fTR.x},${fTR.y} L${fBR.x},${fBR.y} L${fBL.x},${fBL.y} L${bl.x},${bl.y} Z`,
          `M${tr.x},${tr.y} L${br.x},${br.y}`,
          `M${br.x},${br.y} L${bl.x},${bl.y}`,
          `M${br.x},${br.y} L${fBR.x},${fBR.y}`,
          `M${bl.x},${bl.y} L${fBL.x},${fBL.y}`,
        ].join(" ");
        svg.querySelector(`#${idOutline}`)!.setAttribute("d", d);

        const cx = ox + W / 2;
        const cy = oy + H / 2;
        const aw = Math.round(W * 0.25);
        const ah = Math.round(H * 0.19);
        const glyphColor = p > 0.5 ? BG : INK;

        if (direction === "left") {
          setLine(idShaft, cx + aw / 2, cy, cx - aw / 2, cy);
          setLine(idHeadT, cx - aw / 2, cy, cx - aw / 2 + ah, cy - ah);
          setLine(idHeadB, cx - aw / 2, cy, cx - aw / 2 + ah, cy + ah);
        } else {
          setLine(idShaft, cx - aw / 2, cy, cx + aw / 2, cy);
          setLine(idHeadT, cx + aw / 2, cy, cx + aw / 2 - ah, cy - ah);
          setLine(idHeadB, cx + aw / 2, cy, cx + aw / 2 - ah, cy + ah);
        }

        svg.querySelectorAll(`#glyph-${uid} line`).forEach((line) => {
          line.setAttribute("stroke", glyphColor);
        });
      },
      [direction, idBottom, idHeadB, idHeadT, idOutline, idRight, idShaft, idTop, uid, W, H],
    );

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const startAnim = useCallback(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      const step = () => {
        progressRef.current = lerp(progressRef.current, targetRef.current, 0.14);
        draw(progressRef.current);

        if (Math.abs(progressRef.current - targetRef.current) > 0.0005) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          progressRef.current = targetRef.current;
          draw(progressRef.current);
          rafRef.current = null;
        }
      };

      rafRef.current = requestAnimationFrame(step);
    }, [draw]);

    const press = useCallback(() => {
      targetRef.current = 1;
      startAnim();
    }, [startAnim]);

    const release = useCallback(() => {
      targetRef.current = 0;
      startAnim();
    }, [startAnim]);

    useImperativeHandle(ref, () => ({ press, release }), [press, release]);

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
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }, [draw, release]);

    const handleDown = () => {
      press();
      onPress?.();
    };

  return (
    <div className={`inline-flex ${className}`} style={style}>
      <svg
        ref={svgRef}
        width={svgW}
        height={svgH}
        viewBox={`${viewBoxX} 0 ${svgW} ${svgH}`}
        style={{ cursor: "pointer", overflow: "visible", display: "block" }}
        role="button"
        aria-label={ariaLabel ?? (direction === "left" ? "Move left" : "Move right")}
        onMouseDown={(e) => {
          e.preventDefault();
          handleDown();
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          handleDown();
        }}
      >
        <polygon id={idRight} fill={BG} stroke="none" />
        <polygon id={idBottom} fill={BG} stroke="none" />
        <polygon id={idTop} fill={BG} stroke="none" />
        <path
          id={idOutline}
          fill="none"
          stroke={INK}
          strokeWidth="1.5"
          strokeLinejoin="miter"
          strokeLinecap="butt"
        />
        <g id={`glyph-${uid}`}>
          <line
            id={idShaft}
            stroke={INK}
            strokeWidth="1.5"
            strokeLinecap="butt"
          />
          <line
            id={idHeadT}
            stroke={INK}
            strokeWidth="1.5"
            strokeLinecap="butt"
          />
          <line
            id={idHeadB}
            stroke={INK}
            strokeWidth="1.5"
            strokeLinecap="butt"
          />
        </g>
      </svg>
    </div>
  );
  },
);

export default ArrowKeycap;
