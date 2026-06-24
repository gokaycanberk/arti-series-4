"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
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

/** Figma Done butonu — 166×66 */
const SVG_W = 166;
const SVG_H = 66;
const FACE_CX = 80.5;
const FACE_CY = 30.5;
const PRESS_OFFSET = 5;

const DoneKeycap = forwardRef<DoneKeycapHandle, DoneKeycapProps>(
  function DoneKeycap({ onPress, className = "", disabled = false }, ref) {
    const faceRef = useRef<SVGGElement>(null);
    const labelRef = useRef<SVGTextElement>(null);
    const progressRef = useRef(0);
    const targetRef = useRef(0);
    const rafRef = useRef<number | null>(null);

    const draw = useCallback((p: number) => {
      const face = faceRef.current;
      const label = labelRef.current;
      if (!face) return;

      const ox = PRESS_OFFSET * p;
      const oy = PRESS_OFFSET * p;
      face.setAttribute("transform", `translate(${ox}, ${oy})`);

      if (label) {
        label.setAttribute("fill", p > 0.5 ? "#E5E5E5" : "#1A1A1A");
      }
    }, []);

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
          width={SVG_W}
          height={SVG_H}
          viewBox="0 0 166 66"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            cursor: disabled ? "default" : "pointer",
            display: "block",
            overflow: "visible",
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
          <g clipPath="url(#done-keycap-clip)">
            {/* Gölge — sabit */}
            <path
              d="M160.5 0.5L165.5 5.5V65.5H5.5L0.5 60.5"
              fill="#E5E5E5"
            />
            <path
              d="M160.5 0.5L165.5 5.5V65.5H5.5L0.5 60.5"
              stroke="#1A1A1A"
              strokeMiterlimit={10}
            />
            <path d="M160.5 60.5L165.5 65.5" stroke="#1A1A1A" strokeMiterlimit={10} />

            {/* Yüz — basınca kayar */}
            <g ref={faceRef}>
              <path
                d="M160.5 0.5H0.5V60.5H160.5V0.5Z"
                fill="#E5E5E5"
                stroke="#1A1A1A"
                strokeLinejoin="round"
              />
              <text
                ref={labelRef}
                x={FACE_CX}
                y={FACE_CY}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#1A1A1A"
                style={{
                  fontFamily: "var(--font-planc), serif",
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                }}
              >
                DONE!
              </text>
            </g>
          </g>
          <defs>
            <clipPath id="done-keycap-clip">
              <rect width={166} height={66} fill="white" />
            </clipPath>
          </defs>
        </svg>
      </div>
    );
  },
);

export default DoneKeycap;
