"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
} from "react";

export interface DoneKeycapHandle {
  press: () => void;
  release: () => void;
}

interface DoneKeycapProps {
  onPress?: () => void;
  className?: string;
  disabled?: boolean;
}

const W = 112;
const H = 36;
const DX = 5;
const DY = 5;
const OX = 8;
const OY = 8;
const BG = "#e5e5e5";
const INK = "#1a1a1a";

const DoneKeycap = forwardRef<DoneKeycapHandle, DoneKeycapProps>(
  function DoneKeycap({ onPress, className = "", disabled = false }, ref) {
    const uid = useId().replace(/:/g, "");
    const svgRef = useRef<SVGSVGElement>(null);
    const progressRef = useRef(0);
    const targetRef = useRef(0);
    const rafRef = useRef<number | null>(null);

    const svgW = W + DX + OX * 2;
    const svgH = H + DY + OY * 2;

    const idRight = `dk-right-${uid}`;
    const idBottom = `dk-bottom-${uid}`;
    const idTop = `dk-top-${uid}`;
    const idOutline = `dk-outline-${uid}`;
    const idLabel = `dk-label-${uid}`;

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

        const label = svg.querySelector(`#${idLabel}`);
        if (label) {
          label.setAttribute("fill", p > 0.5 ? BG : INK);
        }
      },
      [idBottom, idLabel, idOutline, idRight, idTop],
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
      if (disabled) return;
      press();
      onPress?.();
    };

    return (
      <div className={`inline-flex ${className}`}>
        <svg
          ref={svgRef}
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{
            cursor: disabled ? "default" : "pointer",
            overflow: "visible",
            display: "block",
            opacity: disabled ? 0.45 : 1,
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
            x={OX + DX + W / 2}
            y={OY + DY + H / 2 + 5}
            textAnchor="middle"
            fill={INK}
            style={{
              fontFamily: "var(--font-planc), serif",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.04em",
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
