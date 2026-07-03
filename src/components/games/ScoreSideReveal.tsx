"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { getScoreLabel } from "./scoreUtils";

interface Point {
  x: number;
  y: number;
}

interface ScoreSideRevealProps {
  points: number;
  anchorRef: React.RefObject<HTMLElement | null>;
  /** Sabit başlangıç noktası — collapse sırasında anchor kaymasını önler */
  origin?: Point | null;
  onFlyStart?: () => void;
  onScoreLand?: () => void;
  onComplete?: () => void;
  targetId?: string;
  label?: string | null;
  /** Gradient Guru: ortada alta katmanlı reveal → devrilerek sağ üste uçuş */
  variant?: "default" | "gradient-guru";
  /** İniş noktasını yukarı kaydır (px) — skorun scoreboard arkasına ulaşması için */
  flyTargetLift?: number;
}

const DEFAULT_FONT = 132;
const GURU_FONT = 168;
const HOLD_DEFAULT = 1.5;
const HOLD_GURU = 1.8;
const FLY_DEFAULT = 2.1;
const FLY_GURU = 2.5;
const ARC_DEFAULT = 210;
const ARC_GURU = 280;
const LAYER_OFFSET = 3.5;

const GLYPH_LAYERS = ["#7CBFC8", "#5AAFB9", "#388897", "#266878"];
const GLYPH_MAIN = "#BF406C";

/** Figma Desktop-64: önden arkaya, üstten alta */
const GURU_STACK_COLORS = [
  "#FF3355",
  "#FF9869",
  "#FFD52E",
  "#FF57B3",
  "#9255D4",
  "#4F8AFF",
  "#3AE091",
  "#45EDE2",
];
/** Figma: katmanlar arası dikey adım (px) */
export const GURU_STACK_STEP = 8;

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

function ScoreGlyph({
  points,
  fontSize,
}: {
  points: number;
  fontSize: number;
}) {
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
            fontSize,
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
          fontSize,
          color: GLYPH_MAIN,
          WebkitTextStroke: "1.5px #1A1A1A",
        }}
      >
        {text}
      </span>
    </div>
  );
}

function readAnchorOrigin(anchor: HTMLElement): Point {
  const r = anchor.getBoundingClientRect();
  return {
    x: r.left + r.width / 2,
    y: r.top + r.height / 2,
  };
}

function readScoreTarget(targetId: string): Point | null {
  const el = document.getElementById(targetId);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    x: r.left + r.width * 0.5,
    y: r.top + r.height * 0.35,
  };
}

/** Guru: katman i ana metnin altında (pozitif Y) */
function guruStackY(originY: number, layerIndex: number) {
  return originY + layerIndex * GURU_STACK_STEP;
}

/** S'nin sağında belirir, ardından sağ üst puan tablosuna uçar */
export default function ScoreSideReveal({
  points,
  anchorRef,
  origin: fixedOrigin,
  onFlyStart,
  onScoreLand,
  onComplete,
  targetId = "gs-score-digits",
  label: labelOverride,
  variant = "default",
  flyTargetLift = 0,
}: ScoreSideRevealProps) {
  const isGuru = variant === "gradient-guru";
  const fontSize = isGuru ? GURU_FONT : DEFAULT_FONT;
  const holdDuration = isGuru ? HOLD_GURU : HOLD_DEFAULT;
  const flyDuration = isGuru ? FLY_GURU : FLY_DEFAULT;
  const arcLift = isGuru ? ARC_GURU : ARC_DEFAULT;
  const ghostCount = isGuru ? 7 : 6;
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
    if (!root || !main) return;

    const resolveOrigin = (): Point | null => {
      if (fixedOrigin) return fixedOrigin;
      if (!anchor) return null;
      return readAnchorOrigin(anchor);
    };

    const startOrigin = resolveOrigin();
    if (!startOrigin) return;

    const setCenter = (el: HTMLElement, x: number, y: number) => {
      gsap.set(el, { x, y, xPercent: -50, yPercent: -50 });
    };

    const revealScale = isGuru ? 1 : 0.78;

    const ctx = gsap.context(() => {
      setCenter(main, startOrigin.x, startOrigin.y);
      gsap.set(main, {
        scale: revealScale,
        opacity: 0,
        rotation: isGuru ? 0 : -6,
      });

      ghostRefs.current.forEach((ghost, i) => {
        if (!ghost) return;
        setCenter(ghost, startOrigin.x, startOrigin.y);
        gsap.set(ghost, {
          scale: isGuru ? 1 : 0.72 - i * 0.05,
          opacity: 0,
          rotation: 0,
          color: isGuru
            ? GURU_STACK_COLORS[i + 1]
            : TRAIL_COLORS[i % TRAIL_COLORS.length],
        });
      });

      const flyParams = {
        origin: startOrigin,
        target: null as Point | null,
        controlX: 0,
        controlY: 0,
        skipFly: false,
      };

      const tl = gsap.timeline({
        onComplete: () => onCompleteRef.current?.(),
      });

      tl.to(main, {
        scale: revealScale,
        opacity: 1,
        rotation: 0,
        duration: isGuru ? 0.38 : 0.42,
        ease: "back.out(2)",
      });

      ghostRefs.current.forEach((ghost, i) => {
        if (!ghost) return;
        const layerIndex = i + 1;

        tl.to(
          ghost,
          {
            opacity: isGuru ? 1 : 0.65 - i * 0.08,
            x: startOrigin.x,
            y: isGuru
              ? guruStackY(startOrigin.y, layerIndex)
              : startOrigin.y + 8 + i * 7,
            xPercent: -50,
            yPercent: -50,
            duration: isGuru ? 0.4 : 0.35,
            ease: "power2.out",
          },
          isGuru ? 0.06 + i * 0.04 : 0.08 + i * 0.05,
        );
      });

      tl.to({}, { duration: holdDuration });

      tl.call(() => {
        onFlyStartRef.current?.();

        flyParams.origin = fixedOrigin ?? startOrigin;
        flyParams.target = readScoreTarget(targetId);
        if (!flyParams.target) {
          flyParams.skipFly = true;
          return;
        }

        flyParams.target.y -= flyTargetLift;

        const { origin, target } = flyParams;

        setCenter(main, origin.x, origin.y);
        ghostRefs.current.forEach((ghost, i) => {
          if (!ghost) {
            return;
          }
          setCenter(ghost, origin.x, guruStackY(origin.y, i + 1));
        });

        const deltaX = target.x - origin.x;
        const deltaY = target.y - origin.y;
        flyParams.controlX =
          origin.x + deltaX * 0.48 + Math.min(80, deltaX * 0.08);
        flyParams.controlY = origin.y + deltaY * 0.08 - arcLift;
      });

      const positionOnArc = (
        el: HTMLElement,
        t: number,
        layerIndex: number,
      ) => {
        if (flyParams.skipFly || !flyParams.target) return;
        const { origin, target, controlX, controlY } = flyParams;
        const stackOffset = isGuru ? layerIndex * GURU_STACK_STEP * (1 - t) : 0;
        setCenter(
          el,
          quadBezier(t, origin.x, controlX, target.x),
          quadBezier(t, origin.y, controlY, target.y) + stackOffset,
        );
      };

      const flyAlongArc = (
        el: HTMLElement,
        layerIndex: number,
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

        tl.to(
          proxy,
          {
            t: 1,
            duration,
            delay,
            ease: "power1.inOut",
            onUpdate: () => {
              positionOnArc(el, proxy.t, layerIndex);
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

        tl.fromTo(
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

      if (isGuru) {
        /** Figma Desktop-63: katmanlar devrilerek sağ üste */
        const guruFlyRotations = [13, 28, 43, 44, 50, 59, 61, 69];
        const guruFlyScales = [0.12, 0.1, 0.09, 0.085, 0.08, 0.07, 0.06, 0.05];

        flyAlongArc(
          main,
          0,
          0,
          flyDuration,
          1,
          guruFlyScales[0],
          1,
          1,
          0,
          guruFlyRotations[0],
        );

        ghostRefs.current.forEach((ghost, i) => {
          if (!ghost) return;
          const lag = 0.06 + i * 0.07;
          const trailDuration = flyDuration * (0.96 - i * 0.02);
          const layer = i + 1;

          flyAlongArc(
            ghost,
            layer,
            lag,
            trailDuration,
            1,
            guruFlyScales[layer] ?? 0.05,
            1,
            Math.max(0.15, 1 - layer * 0.1),
            0,
            guruFlyRotations[layer] ?? 69,
          );
        });
      } else {
        flyAlongArc(main, 0, 0, flyDuration, 0.78, 0.12, 1, 0, -6, 18);

        ghostRefs.current.forEach((ghost, i) => {
          if (!ghost) return;
          const lag = 0.1 + i * 0.09;
          const trailDuration = flyDuration * (0.94 - i * 0.03);

          flyAlongArc(
            ghost,
            0,
            lag,
            trailDuration,
            0.7 - i * 0.06,
            0.08,
            0.68 - i * 0.08,
            0,
            -2 + i * 4,
            14 + i * 4,
          );
        });
      }
    }, root);

    return () => {
      ctx.revert();
    };
  }, [
    anchorRef,
    fixedOrigin,
    points,
    targetId,
    variant,
    isGuru,
    holdDuration,
    flyDuration,
    arcLift,
    flyTargetLift,
  ]);

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-0 z-50 overflow-visible"
    >
      {Array.from({ length: ghostCount }).map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            ghostRefs.current[i] = el;
          }}
          className="pointer-events-none absolute left-0 top-0 whitespace-nowrap"
          style={{
            fontFamily: "var(--font-planc), serif",
            fontWeight: 500,
            fontSize,
            WebkitTextStroke: "1.5px #1A1A1A",
            opacity: 0,
            color: isGuru ? GURU_STACK_COLORS[i + 1] : undefined,
          }}
        >
          {text}
        </div>
      ))}

      <div ref={mainRef} className="absolute left-0 top-0">
        <div className="relative inline-block leading-none">
          {label && isGuru && (
            <div
              className="pointer-events-none absolute border border-[#1A1A1A]"
              style={{
                bottom: "100%",
                left: "50%",
                marginBottom: 16,
                transform: "translateX(-50%) rotate(-20deg)",
                backgroundColor: "#dfffd1",
                fontFamily: "var(--font-planc), serif",
                fontWeight: 600,
                fontSize: "clamp(32px, 4vw, 56px)",
                lineHeight: "16px",
                color: "#1A1A1A",
                padding: "10px 14px",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </div>
          )}
          {isGuru ? (
            <span
              className="relative whitespace-nowrap"
              style={{
                fontFamily: "var(--font-planc), serif",
                fontWeight: 500,
                fontSize,
                color: GURU_STACK_COLORS[0],
                WebkitTextStroke: "1.5px #1A1A1A",
              }}
            >
              {text}
            </span>
          ) : (
            <ScoreGlyph points={points} fontSize={fontSize} />
          )}
        </div>
        {label && !isGuru && (
          <div
            className="pointer-events-none absolute border border-[#1A1A1A]"
            style={{
              top: -22,
              right: -36,
              backgroundColor: "#B8F04A",
              fontFamily: "var(--font-planc), serif",
              fontWeight: 700,
              fontSize: "12px",
              color: "#1A1A1A",
              transform: "rotate(18deg)",
              padding: "2px 10px",
            }}
          >
            {label}
          </div>
        )}
      </div>
    </div>
  );
}
