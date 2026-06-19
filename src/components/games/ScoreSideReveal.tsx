"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { getScoreLabel } from "./scoreUtils";

interface ScoreSideRevealProps {
  points: number;
  anchorRef: React.RefObject<HTMLElement | null>;
  onFlyStart?: () => void;
  onScoreLand?: () => void;
  onComplete?: () => void;
  targetId?: string;
  label?: string | null;
}

const SCORE_FONT_SIZE = 132;
const HOLD_DURATION = 1.5;
const FLY_DURATION = 2.1;
const ARC_LIFT = 210;
const LAYER_OFFSET = 3.5;

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
          className="pointer-events-none absolute left-0 top-0 whitespace-nowrap"
          style={{
            fontSize: SCORE_FONT_SIZE,
            color,
            WebkitTextStroke: "1.5px #1A1A1A",
            transform: `translate(${3 + i * LAYER_OFFSET}px, ${3 + i * LAYER_OFFSET}px)`,
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

function readAnchorOrigin(anchor: HTMLElement) {
  const r = anchor.getBoundingClientRect();
  return {
    x: r.left + r.width / 2,
    y: r.top + r.height / 2,
  };
}

function readScoreTarget(targetId: string) {
  const el = document.getElementById(targetId);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    x: r.left + r.width * 0.5,
    y: r.top + r.height * 0.35,
  };
}

/** S'nin sağında belirir, ardından sağ üst puan tablosuna uçar */
export default function ScoreSideReveal({
  points,
  anchorRef,
  onFlyStart,
  onScoreLand,
  onComplete,
  targetId = "gs-score-digits",
  label: labelOverride,
}: ScoreSideRevealProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const ghostRefs = useRef<(HTMLDivElement | null)[]>([]);
  const onFlyStartRef = useRef(onFlyStart);
  const onScoreLandRef = useRef(onScoreLand);
  const onCompleteRef = useRef(onComplete);
  const scoreLandedRef = useRef(false);
  const label = labelOverride ?? getScoreLabel(points);
  const text = `+${points}`;

  useEffect(() => {
    onFlyStartRef.current = onFlyStart;
    onScoreLandRef.current = onScoreLand;
    onCompleteRef.current = onComplete;
  }, [onFlyStart, onScoreLand, onComplete]);

  useLayoutEffect(() => {
    scoreLandedRef.current = false;

    const root = rootRef.current;
    const main = mainRef.current;
    const anchor = anchorRef.current;
    if (!root || !main || !anchor) return;

    const setCenter = (el: HTMLElement, x: number, y: number) => {
      gsap.set(el, { x, y, xPercent: -50, yPercent: -50 });
    };

    const ctx = gsap.context(() => {
      const startOrigin = readAnchorOrigin(anchor);
      setCenter(main, startOrigin.x, startOrigin.y);
      gsap.set(main, { scale: 0.78, opacity: 0, rotation: -6 });

      ghostRefs.current.forEach((ghost, i) => {
        if (!ghost) return;
        setCenter(ghost, startOrigin.x, startOrigin.y);
        gsap.set(ghost, {
          scale: 0.72 - i * 0.05,
          opacity: 0,
          rotation: -4 + i * 3,
          color: TRAIL_COLORS[i % TRAIL_COLORS.length],
        });
      });

      const tl = gsap.timeline({
        onComplete: () => onCompleteRef.current?.(),
      });

      tl.to(main, {
        scale: 0.78,
        opacity: 1,
        rotation: 0,
        duration: 0.42,
        ease: "back.out(2)",
      });

      ghostRefs.current.forEach((ghost, i) => {
        if (!ghost) return;
        tl.to(
          ghost,
          {
            opacity: 0.65 - i * 0.08,
            x: startOrigin.x + 12 + i * 9,
            y: startOrigin.y + 8 + i * 7,
            xPercent: -50,
            yPercent: -50,
            duration: 0.35,
            ease: "power2.out",
          },
          0.08 + i * 0.05,
        );
      });

      tl.to({}, { duration: HOLD_DURATION });

      tl.call(() => {
        onFlyStartRef.current?.();

        const anchorEl = anchorRef.current;
        if (!anchorEl) return;

        const origin = readAnchorOrigin(anchorEl);
        const target = readScoreTarget(targetId);
        if (!target) return;

        setCenter(main, origin.x, origin.y);
        ghostRefs.current.forEach((ghost) => {
          if (ghost) setCenter(ghost, origin.x, origin.y);
        });

        const deltaX = target.x - origin.x;
        const deltaY = target.y - origin.y;
        const controlX = origin.x + deltaX * 0.54 + Math.min(96, deltaX * 0.1);
        const controlY = origin.y + deltaY * 0.12 - ARC_LIFT;

        const flyTl = gsap.timeline();

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
        ) => {
          const proxy = { t: 0 };

          flyTl.to(
            proxy,
            {
              t: 1,
              duration,
              delay,
              ease: "power1.inOut",
              onUpdate: () => {
                setCenter(
                  el,
                  quadBezier(proxy.t, origin.x, controlX, target.x),
                  quadBezier(proxy.t, origin.y, controlY, target.y),
                );

                if (
                  !scoreLandedRef.current &&
                  proxy.t >= 0.88 &&
                  el === main
                ) {
                  scoreLandedRef.current = true;
                  onScoreLandRef.current?.();
                }
              },
            },
            "fly",
          );

          flyTl.fromTo(
            el,
            {
              scale: fromScale,
              opacity: fromOpacity,
              rotation: fromRotation,
            },
            {
              scale: toScale,
              opacity: toOpacity,
              rotation: toRotation,
              duration,
              delay,
              ease: "power1.inOut",
            },
            "fly",
          );
        };

        flyAlongArc(main, 0, FLY_DURATION, 0.78, 0.14, 1, 0, 0, 18);

        ghostRefs.current.forEach((ghost, i) => {
          if (!ghost) return;
          const lag = 0.1 + i * 0.09;
          const trailDuration = FLY_DURATION * (0.94 - i * 0.03);

          flyAlongArc(
            ghost,
            lag,
            trailDuration,
            0.7 - i * 0.06,
            0.1,
            0.68 - i * 0.08,
            0,
            -2 + i * 4,
            14 + i * 4,
          );
        });

        tl.add(flyTl);
      });
    }, root);

    return () => {
      ctx.revert();
    };
  }, [anchorRef, points, targetId]);

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-0 z-50 overflow-visible"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            ghostRefs.current[i] = el;
          }}
          className="pointer-events-none absolute left-0 top-0 whitespace-nowrap"
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
            className="absolute border border-[#1A1A1A] px-2.5 py-0.5"
            style={{
              top: -22,
              right: -36,
              backgroundColor: "#B8F04A",
              fontFamily: "var(--font-planc), serif",
              fontWeight: 700,
              fontSize: "12px",
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
