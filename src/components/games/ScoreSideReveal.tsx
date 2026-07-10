"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import {
  getLabelImpact,
  getScoreLabel,
  type ScoreLabel,
  SCORE_STACK_COLORS,
  SCORE_STACK_LAYERS,
  SCORE_STACK_STEP,
  SCORE_ORIGIN_Y_OFFSET,
} from "./scoreUtils";

interface Point {
  x: number;
  y: number;
}

interface ScoreSideRevealProps {
  points: number;
  anchorRef: React.RefObject<HTMLElement | null>;
  origin?: Point | null;
  onFlyStart?: () => void;
  onScoreLand?: () => void;
  onComplete?: () => void;
  targetId?: string;
  label?: string | null;
  /** @deprecated — tek Figma animasyonu */
  variant?: "default" | "gradient-guru";
  flyTargetLift?: number;
}

/** GradientGuru skor origin hesabı */
export const GURU_STACK_STEP = SCORE_STACK_STEP;

const FONT_SIZE = "clamp(140px, 16vw, 200px)";
const LABEL_FONT = "clamp(22px, 3.2vw, 56px)";
const LABEL_PAD_X = 8;
const LABEL_PAD_Y = 6;
const LAYER_STAGGER = 0.055;
const LAYER_REVEAL = 0.36;
const DRIFT_UP_PX = 10;
const PRE_FLY_HOLD = 0.7;

/** Figma 20-1918 */
const FLY_DURATION = 0.95;
const FLY_LAYER_LAG = 0.052;
const ARC_LIFT = 130;
const LABEL_FADE = 0.28;

const LABEL_ROTATION = -20;
const LABEL_Y_RATIO = 0.55;

function quadBezier(t: number, p0: number, p1: number, p2: number) {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}

function readAnchorOrigin(anchor: HTMLElement): Point {
  const r = anchor.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function readScoreTarget(targetId: string): Point | null {
  const el = document.getElementById(targetId);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.35 };
}

/** Katman i: 0 = alt (ilk renk), 7 = üst — yukarı doğru yığılır */
function layerStackY(baseY: number, index: number) {
  return baseY - index * SCORE_STACK_STEP;
}

function stackVisualCenterY(stackY: number) {
  return stackY - (SCORE_STACK_LAYERS - 1) * SCORE_STACK_STEP * LABEL_Y_RATIO;
}

function setCenter(el: HTMLElement, x: number, y: number) {
  gsap.set(el, { x, y, xPercent: -50, yPercent: -50 });
}

/** Uçuş sırası: 0 = en üst katman önce gider */
function flyOrderForLayer(index: number) {
  return SCORE_STACK_LAYERS - 1 - index;
}

/**
 * Figma: 20-1654 ilk renk → 20-1831 yukarı yansıma → 13-1553 etiket → 20-1918 scoreboard
 */
export default function ScoreSideReveal({
  points,
  anchorRef,
  origin: fixedOrigin,
  onFlyStart,
  onScoreLand,
  onComplete,
  targetId = "gs-score-digits",
  label: labelOverride,
  flyTargetLift = 0,
}: ScoreSideRevealProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const labelRef = useRef<HTMLDivElement>(null);
  const onFlyStartRef = useRef(onFlyStart);
  const onScoreLandRef = useRef(onScoreLand);
  const onCompleteRef = useRef(onComplete);
  const label = labelOverride ?? getScoreLabel(points);
  const text = `+${points}`;

  useEffect(() => {
    onFlyStartRef.current = onFlyStart;
    onScoreLandRef.current = onScoreLand;
    onCompleteRef.current = onComplete;
  }, [onFlyStart, onScoreLand, onComplete]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const labelEl = labelRef.current;
    if (!root) return;

    const rawOrigin = fixedOrigin
      ? fixedOrigin
      : anchorRef.current
        ? readAnchorOrigin(anchorRef.current)
        : null;
    if (!rawOrigin) return;

    const startOrigin = {
      x: rawOrigin.x,
      y: rawOrigin.y + SCORE_ORIGIN_Y_OFFSET,
    };

    const ctx = gsap.context(() => {
      const stack = { x: startOrigin.x, y: startOrigin.y };

      const syncStack = () => {
        layerRefs.current.forEach((layer, i) => {
          if (!layer) return;
          setCenter(layer, stack.x, layerStackY(stack.y, i));
        });
        if (labelEl) {
          setCenter(labelEl, stack.x, stackVisualCenterY(stack.y));
        }
      };

      // Tüm katmanlar aynı noktada başlar — ilk renk
      layerRefs.current.forEach((layer, i) => {
        if (!layer) return;
        setCenter(layer, stack.x, stack.y);
        gsap.set(layer, {
          opacity: 0,
          scale: 1,
          rotation: 0,
          color: SCORE_STACK_COLORS[i],
          transformOrigin: "50% 50%",
        });
      });

      const labelImpact = label
        ? getLabelImpact(label as ScoreLabel)
        : null;

      if (labelEl) {
        setCenter(labelEl, stack.x, stackVisualCenterY(stack.y));
        gsap.set(labelEl, {
          opacity: 0,
          scale: labelImpact?.startScale ?? 0,
          rotation: labelImpact?.startRotation ?? LABEL_ROTATION,
          transformOrigin: "50% 50%",
        });
      }

      const revealDuration =
        LAYER_REVEAL + (SCORE_STACK_LAYERS - 1) * LAYER_STAGGER;

      const tl = gsap.timeline({
        onComplete: () => onCompleteRef.current?.(),
      });

      // 20-1654 → 20-1831: ilk renk, sonra yukarı yansıma (aynı boyut)
      layerRefs.current.forEach((layer, i) => {
        if (!layer) return;
        const at = i * LAYER_STAGGER;
        const finalY = layerStackY(stack.y, i);

        if (i === 0) {
          tl.to(
            layer,
            { opacity: 1, duration: LAYER_REVEAL, ease: "power2.out" },
            at,
          );
        } else {
          const rise = { y: stack.y };
          tl.set(layer, { opacity: 1 }, at);
          tl.to(
            rise,
            {
              y: finalY,
              duration: LAYER_REVEAL,
              ease: "power2.out",
              onUpdate: () => setCenter(layer, stack.x, rise.y),
            },
            at,
          );
        }
      });

      // Hafif yukarı süzülme — stack tamamlandıktan sonra
      tl.to(
        stack,
        {
          y: startOrigin.y - DRIFT_UP_PX,
          duration: 0.32,
          ease: "power1.out",
          onUpdate: syncStack,
        },
        revealDuration,
      );

      const labelAt = revealDuration + 0.38;

      if (label && labelEl && labelImpact) {
        tl.add(() => onFlyStartRef.current?.(), labelAt);

        tl.to(
          labelEl,
          {
            opacity: 1,
            scale: labelImpact.overshoot,
            rotation: LABEL_ROTATION,
            duration: labelImpact.slam,
            ease: "power4.in",
          },
          labelAt,
        );

        tl.to(
          labelEl,
          {
            scale: 1,
            duration: labelImpact.settle,
            ease: "power2.out",
          },
          labelAt + labelImpact.slam,
        );

        const labelPopDone = labelAt + labelImpact.slam + labelImpact.settle;
        tl.add(() => onScoreLandRef.current?.(), labelPopDone);
      } else {
        tl.add(() => {
          onFlyStartRef.current?.();
          onScoreLandRef.current?.();
        }, labelAt);
      }

      tl.to({}, { duration: PRE_FLY_HOLD });

      const flyAt = tl.duration();
      const flyTarget = readScoreTarget(targetId);

      if (!flyTarget) {
        layerRefs.current.forEach((layer) => {
          if (!layer) return;
          tl.to(
            layer,
            { opacity: 0, scale: 0.5, duration: 0.35, ease: "power2.in" },
            flyAt,
          );
        });
        if (labelEl) {
          tl.to(
            labelEl,
            { opacity: 0, scale: 0.5, duration: LABEL_FADE, ease: "power2.in" },
            flyAt,
          );
        }
        return;
      }

      const target = {
        x: flyTarget.x,
        y: flyTarget.y - flyTargetLift,
      };

      const stackCenterY =
        stack.y - ((SCORE_STACK_LAYERS - 1) * SCORE_STACK_STEP) / 2;
      const ctrlX =
        stack.x + (target.x - stack.x) * 0.45 + Math.min(60, Math.abs(target.x - stack.x) * 0.06);
      const ctrlY = stackCenterY + (target.y - stackCenterY) * 0.12 - ARC_LIFT;

      if (labelEl) {
        tl.to(
          labelEl,
          {
            opacity: 0,
            scale: 0.55,
            duration: LABEL_FADE,
            ease: "power3.in",
          },
          flyAt,
        );
      }

      // 20-1918: üstten alta tren — aynı kavis, kademeli kalkış
      layerRefs.current.forEach((layer, i) => {
        if (!layer) return;

        const flyOrder = flyOrderForLayer(i);
        const delay = flyOrder * FLY_LAYER_LAG;
        const duration = FLY_DURATION - flyOrder * 0.02;
        const startX = stack.x;
        const startY = layerStackY(stack.y, i);
        const endScale = 0.05 + flyOrder * 0.009;
        const endRotation = 62 - flyOrder * 7;
        const proxy = { t: 0 };

        tl.to(
          proxy,
          {
            t: 1,
            duration,
            delay,
            ease: "power1.in",
            onUpdate: () => {
              const t = proxy.t;
              const x = quadBezier(t, startX, ctrlX, target.x);
              const y = quadBezier(t, startY, ctrlY, target.y);
              const scale = gsap.utils.interpolate(1, endScale, t);
              const rotation = gsap.utils.interpolate(0, endRotation, t);
              const opacity =
                t < 0.65 ? 1 : gsap.utils.interpolate(1, 0, (t - 0.65) / 0.35);

              gsap.set(layer, {
                x,
                y,
                xPercent: -50,
                yPercent: -50,
                scale,
                rotation,
                opacity,
              });
            },
          },
          flyAt,
        );
      });
    }, root);

    return () => {
      ctx.revert();
    };
  }, [anchorRef, fixedOrigin, points, label, targetId, flyTargetLift]);

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-0 z-50 overflow-visible"
    >
      {SCORE_STACK_COLORS.map((color, i) => (
        <span
          key={color}
          ref={(el) => {
            layerRefs.current[i] = el;
          }}
          className="pointer-events-none absolute left-0 top-0 whitespace-nowrap"
          style={{
            fontFamily: "var(--font-planc), serif",
            fontWeight: 500,
            fontSize: FONT_SIZE,
            lineHeight: 1,
            WebkitTextStroke: "1.5px #1A1A1A",
            color,
            opacity: 0,
            transformOrigin: "50% 50%",
            zIndex: i + 1,
          }}
        >
          {text}
        </span>
      ))}

      {label && (
        <div
          ref={labelRef}
          className="pointer-events-none absolute left-0 top-0 border border-[#1A1A1A] bg-[#DFFFD1] whitespace-nowrap"
          style={{
            fontFamily: "var(--font-planc), serif",
            fontWeight: 600,
            fontSize: LABEL_FONT,
            lineHeight: 1,
            color: "#1A1A1A",
            padding: `${LABEL_PAD_Y}px ${LABEL_PAD_X}px`,
            zIndex: SCORE_STACK_LAYERS + 2,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
