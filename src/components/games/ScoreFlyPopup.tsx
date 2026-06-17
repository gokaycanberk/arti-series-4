"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { getScoreLabel } from "./scoreUtils";

interface ScoreFlyPopupProps {
  points: number;
  anchorRef: React.RefObject<HTMLElement | null>;
  onComplete?: () => void;
}

const SCORE_FONT_SIZE = 200;
const SCORE_HOLD_DURATION = 1.5;
const SCORE_FLY_DURATION = 1.45;
const SCORE_ARC_LIFT = 150;
const LAYER_COLORS = ["#00E5FF", "#26C6DA", "#00ACC1", "#00838F", "#006064"];

function ScoreGlyph({ points }: { points: number }) {
  const text = `+${points}`;

  return (
    <div className="relative" style={{ fontFamily: "var(--font-planc), serif", fontWeight: 600 }}>
      {LAYER_COLORS.map((color, i) => (
        <span
          key={color}
          aria-hidden
          className="absolute left-0 top-0 whitespace-nowrap pointer-events-none"
          style={{
            fontSize: SCORE_FONT_SIZE,
            color,
            WebkitTextStroke: "1.5px #1A1A1A",
            transform: `translate(${i * 5}px, ${i * 5}px)`,
            opacity: 1 - i * 0.12,
          }}
        >
          {text}
        </span>
      ))}
      <span
        className="relative whitespace-nowrap"
        style={{
          fontSize: SCORE_FONT_SIZE,
          color: "#00E5FF",
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
}: ScoreFlyPopupProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  const label = getScoreLabel(points);
  const text = `+${points}`;

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const root = rootRef.current;
    const main = mainRef.current;
    const anchor = anchorRef.current;
    if (!root || !main || !anchor) return;

    const anchorRect = anchor.getBoundingClientRect();
    const ghosts = root.querySelectorAll<HTMLElement>("[data-ghost]");

    const originX = anchorRect.left + anchorRect.width / 2;
    const originY = anchorRect.top + anchorRect.height / 2;

    gsap.set(root, {
      x: originX,
      y: originY,
      xPercent: -50,
      yPercent: -50,
    });
    gsap.set(main, { scale: 0, opacity: 0, rotation: -4 });
    gsap.set(ghosts, { opacity: 0, x: 0, y: 0, rotation: 0, scale: 1 });

    const finish = () => onCompleteRef.current?.();

    const target = document.getElementById("gs-score-digits");
    if (!target) {
      const fallback = gsap.delayedCall(SCORE_HOLD_DURATION + SCORE_FLY_DURATION + 0.3, finish);
      return () => {
        fallback.kill();
      };
    }

    const targetRect = target.getBoundingClientRect();
    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;

    const deltaX = targetX - originX;
    const arcX = originX + deltaX * 0.22;
    const arcY = originY - SCORE_ARC_LIFT;

    const tl = gsap.timeline({ onComplete: finish });

    tl.to(main, {
      scale: 1,
      opacity: 1,
      rotation: 0,
      duration: 0.35,
      ease: "back.out(2)",
    });

    tl.to({}, { duration: SCORE_HOLD_DURATION });

    const flyPhase1 = SCORE_FLY_DURATION * 0.45;
    const flyPhase2 = SCORE_FLY_DURATION * 0.55;

    tl.to(
      root,
      {
        x: arcX,
        y: arcY,
        duration: flyPhase1,
        ease: "power1.out",
      },
      "fly",
    );

    tl.to(
      main,
      {
        rotation: 12,
        scale: 0.55,
        duration: flyPhase1,
        ease: "power1.out",
      },
      "fly",
    );

    tl.to(
      root,
      {
        x: targetX,
        y: targetY,
        duration: flyPhase2,
        ease: "power2.inOut",
      },
      `fly+=${flyPhase1 * 0.55}`,
    );

    tl.to(
      main,
      {
        rotation: 24,
        scale: 0.2,
        duration: flyPhase2,
        ease: "power2.inOut",
      },
      `fly+=${flyPhase1 * 0.55}`,
    );

    const trailColors = ["#69F0AE", "#448AFF", "#7C4DFF", "#FF4081", "#FF5252", "#FF9100"];
    ghosts.forEach((ghost, i) => {
      const lag = i * 0.07;
      const trailScale = 0.92 - i * 0.06;
      const ghostArcX = originX + (arcX - originX) * trailScale;
      const ghostArcY = originY + (arcY - originY) * trailScale - i * 8;
      const ghostTargetX = originX + (targetX - originX) * trailScale;
      const ghostTargetY = originY + (targetY - originY) * trailScale;

      gsap.set(ghost, {
        opacity: 0.55 - i * 0.07,
        color: trailColors[i % trailColors.length],
      });

      tl.to(
        ghost,
        {
          x: ghostArcX - originX,
          y: ghostArcY - originY,
          rotation: 8 + i * 6,
          scale: 0.5 - i * 0.04,
          duration: flyPhase1,
          ease: "power1.out",
        },
        `fly+=${lag}`,
      );

      tl.to(
        ghost,
        {
          x: ghostTargetX - originX,
          y: ghostTargetY - originY,
          rotation: 20 + i * 5,
          scale: 0.18,
          opacity: 0,
          duration: flyPhase2,
          ease: "power2.inOut",
        },
        `fly+=${flyPhase1 * 0.55 + lag}`,
      );
    });

    tl.to(main, { opacity: 0, duration: 0.12 }, "-=0.08");

    return () => {
      tl.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tek seferlik animasyon
  }, [points]);

  return (
    <div ref={rootRef} className="fixed left-0 top-0 z-40 pointer-events-none">
      <div ref={mainRef} className="relative">
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

      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          data-ghost
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
    </div>
  );
}
