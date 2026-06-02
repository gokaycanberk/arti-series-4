"use client";

import { useCallback, useEffect, useId, useRef } from "react";

interface PressButtonProps {
  label?: string;
  onClick?: () => void;
  className?: string;
  width?: number;
  height?: number;
}

export default function PressButton({
  label = "LET'S GO!",
  onClick,
  className = "",
  width = 64,
  height = 32,
}: PressButtonProps) {
  const uid = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const progressRef = useRef(0);
  const targetRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const DX = 8;
  const DY = 8;
  const OX = 8;
  const OY = 8;
  const W = width;
  const H = height;

  const BG = "#e5e5e5";
  const INK = "#1a1a1a";

  const svgW = W + DX + OX * 2;
  const svgH = H + DY + OY * 2;

  const idRight = `f-right-${uid}`;
  const idBottom = `f-bottom-${uid}`;
  const idTop = `f-top-${uid}`;
  const idOutline = `outline-${uid}`;
  const idLabel = `btn-label-${uid}`;

  const pts = (arr: { x: number; y: number }[]) =>
    arr.map((p) => `${p.x},${p.y}`).join(" ");

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

      const textEl = svg.querySelector(`#${idLabel}`) as SVGTextElement | null;
      if (textEl) {
        textEl.setAttribute("fill", p > 0.5 ? BG : INK);
        textEl.setAttribute("x", String(ox + W / 2));
        textEl.setAttribute("y", String(oy + H / 2));
        textEl.textContent = label;
      }
    },
    [W, H, label, idRight, idBottom, idTop, idOutline, idLabel],
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
    onClick?.();
  }, [onClick, startAnim]);

  useEffect(() => {
    draw(0);

    const handleMouseUp = () => {
      if (targetRef.current === 1) {
        release();
      }
    };
    const handleTouchEnd = () => {
      if (targetRef.current === 1) {
        release();
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchend", handleTouchEnd);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [draw, release]);

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <svg
        ref={svgRef}
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ cursor: "pointer", overflow: "visible", display: "block" }}
        onMouseDown={(event) => {
          event.preventDefault();
          press();
        }}
        onTouchStart={(event) => {
          event.preventDefault();
          press();
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
        <text
          id={idLabel}
          textAnchor="middle"
          dominantBaseline="central"
          fill={INK}
          fontSize="20"
          fontFamily="'Planc', sans-serif"
          fontWeight="450"
          letterSpacing="0"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {label}
        </text>
      </svg>
    </div>
  );
}
