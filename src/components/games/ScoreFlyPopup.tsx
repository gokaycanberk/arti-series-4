"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { getScoreLabel } from "./scoreUtils";

interface ScoreFlyPopupProps {
  points: number;
  anchorRef: React.RefObject<HTMLElement | null>;
  onComplete?: () => void;
  /** Skor paneli hedefi — varsayılan: GameShell `#gs-score-digits` */
  targetId?: string;
  /** getScoreLabel yerine özel etiket */
  label?: string | null;
}

const SCORE_FONT_SIZE = 200;
const SCORE_HOLD_DURATION = 1.5;
const SCORE_FLY_DURATION = 1.9;
const SCORE_ARC_LIFT = 130;

const GLYPH_LAYERS = ["#7CBFC8", "#5AAFB9", "#388897", "#266878"];
const GLYPH_MAIN = "#BF406C";
const TRAIL_COLORS = [
  "#5AD8FF",
  "#69F0AE",
  "#FF80AB",
  "#FFD54F",
  "#FF9100",
  "#FF5252",
];

function quadBezier(t: number, p0: number, p1: number, p2: number) {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}

function ScoreGlyph({ points }: { points: number }) {
  const text = `+${points}`;

  return (
    <div
      className="relative"
      style={{ fontFamily: "var(--font-planc), serif", fontWeight: 600 }}
    >
      {GLYPH_LAYERS.map((color, i) => (
        <span
          key={color}
          aria-hidden
          className="absolute left-0 top-0 whitespace-nowrap pointer-events-none"
          style={{
            fontSize: SCORE_FONT_SIZE,
            color,
            WebkitTextStroke: "1.5px #1A1A1A",
            transform: `translate(${4 + i * 5}px, ${4 + i * 5}px)`,
            opacity: 1 - i * 0.1,
          }}
        >
          {text}
        </span>
      ))}
      <span
        className="relative whitespace-nowrap"
        style={{
          fontSize: SCORE_FONT_SIZE,
          color: GLYPH_MAIN,
          WebkitTextStroke: "1.5px #1A1A1A",
        }}
      >
        {text}
      </span>
    </div>
  );
}

export default function ScoreFlyPopup({
  points,
  anchorRef,
  onComplete,
  targetId = "gs-score-digits",
  label: labelOverride,
}: ScoreFlyPopupProps) {
  const mainRef = useRef<HTMLDivElement>(null);
  const ghostRefs = useRef<(HTMLDivElement | null)[]>([]);
  const onCompleteRef = useRef(onComplete);
  const label = labelOverride ?? getScoreLabel(points);
  const text = `+${points}`;

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const main = mainRef.current;
    const anchor = anchorRef.current;
    if (!main || !anchor) return;

    const anchorRect = anchor.getBoundingClientRect();
    const originX = anchorRect.left + anchorRect.width / 2;
    const originY = anchorRect.top + anchorRect.height / 2;

    const finish = () => onCompleteRef.current?.();
    const target = document.getElementById(targetId);

    const setCenter = (el: HTMLElement, x: number, y: number) => {
      gsap.set(el, { x, y, xPercent: -50, yPercent: -50 });
    };

    setCenter(main, originX, originY);
    gsap.set(main, { scale: 0, opacity: 0, rotation: -6 });

    ghostRefs.current.forEach((ghost, i) => {
      if (!ghost) return;
      setCenter(ghost, originX, originY);
      gsap.set(ghost, {
        scale: 0.88 - i * 0.06,
        opacity: 0,
        rotation: -4 + i * 3,
        color: TRAIL_COLORS[i % TRAIL_COLORS.length],
      });
    });

    if (!target) {
      const fallback = gsap.delayedCall(
        SCORE_HOLD_DURATION + SCORE_FLY_DURATION + 0.3,
        finish,
      );
      return () => {
        fallback.kill();
      };
    }

    const targetRect = target.getBoundingClientRect();
    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;

    const deltaX = targetX - originX;
    const deltaY = targetY - originY;
    const controlX = originX + deltaX * 0.52 + Math.min(80, deltaX * 0.08);
    const controlY = originY + deltaY * 0.22 - SCORE_ARC_LIFT;

    const flyAlongArc = (
      el: HTMLElement,
      delay: number,
      duration: number,
      fromScale: number,
      toScale: number,
      fromOpacity: number,
      toOpacity: number,
      fromRotation: number,
      toRotation: number,
      timeline: gsap.core.Timeline,
      position: string,
    ) => {
      const proxy = { t: 0 };
      timeline.fromTo(
        proxy,
        { t: 0 },
        {
          t: 1,
          duration,
          delay,
          ease: "power1.inOut",
          onUpdate: () => {
            setCenter(
              el,
              quadBezier(proxy.t, originX, controlX, targetX),
              quadBezier(proxy.t, originY, controlY, targetY),
            );
          },
        },
        position,
      );

      timeline.fromTo(
        el,
        { scale: fromScale, opacity: fromOpacity, rotation: fromRotation },
        {
          scale: toScale,
          opacity: toOpacity,
          rotation: toRotation,
          duration,
          delay,
          ease: "power1.inOut",
        },
        position,
      );
    };

    const tl = gsap.timeline({ onComplete: finish });

    tl.to(main, {
      scale: 1,
      opacity: 1,
      rotation: 0,
      duration: 0.38,
      ease: "back.out(2)",
    });

    tl.to({}, { duration: SCORE_HOLD_DURATION });

    flyAlongArc(main, 0, SCORE_FLY_DURATION, 1, 0.16, 1, 0, 0, 18, tl, "fly");

    ghostRefs.current.forEach((ghost, i) => {
      if (!ghost) return;
      const lag = 0.1 + i * 0.09;
      const trailDuration = SCORE_FLY_DURATION * (0.92 - i * 0.04);

      flyAlongArc(
        ghost,
        lag,
        trailDuration,
        0.82 - i * 0.07,
        0.12,
        0.72 - i * 0.09,
        0,
        -2 + i * 4,
        14 + i * 5,
        tl,
        "fly",
      );
    });

    return () => {
      tl.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tek seferlik animasyon
  }, [points, targetId]);

  return (
    <div className="fixed inset-0 z-40 pointer-events-none overflow-visible">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            ghostRefs.current[i] = el;
          }}
          className="absolute left-0 top-0 whitespace-nowrap pointer-events-none"
          style={{
            fontFamily: "var(--font-planc), serif",
            fontWeight: 600,
            fontSize: SCORE_FONT_SIZE,
            WebkitTextStroke: "1.5px #1A1A1A",
            opacity: 0,
          }}
        >
          {text}
        </div>
      ))}

      <div ref={mainRef} className="absolute left-0 top-0">
        {label && (
          <div
            className="absolute border border-[#1A1A1A] px-3 py-1"
            style={{
              top: -28,
              right: -48,
              backgroundColor: "#B8F04A",
              fontFamily: "var(--font-planc), serif",
              fontWeight: 700,
              fontSize: "14px",
              color: "#1A1A1A",
              transform: "rotate(18deg)",
            }}
          >
            {label}
          </div>
        )}
        <ScoreGlyph points={points} />
      </div>
    </div>
  );
}
