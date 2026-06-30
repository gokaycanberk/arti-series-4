"use client";

import { forwardRef, useId } from "react";
import type { MarathonResultMessage } from "@/lib/marathonMessages";
import { BADGE_PX } from "@/components/marathon-results/constants";

interface CircularScoreBadgeProps {
  message: MarathonResultMessage;
  className?: string;
  textRotateRef?: React.Ref<SVGGElement>;
  topArcPathRef?: React.Ref<SVGPathElement>;
  bottomArcPathRef?: React.Ref<SVGPathElement>;
}

export const BADGE_SIZE = BADGE_PX;
export const BADGE_CX = BADGE_PX / 2;
export const BADGE_CY = BADGE_PX / 2;
export const BADGE_OUTER_R = BADGE_PX / 2;

/** İnce halka — Figma 80:2405 (~32px band, kart köşelerine pay) */
export const BADGE_INNER_R_BASE = 318;

/** Kalın halka — Figma 80:2223 (~62px band) */
export const BADGE_INNER_R_THICK = 288;

export function getTextArcRadius(innerR: number): number {
  return (BADGE_OUTER_R + innerR) / 2;
}

export const TEXT_ARC_R_BASE = getTextArcRadius(BADGE_INNER_R_BASE);
export const TEXT_ARC_R_THICK = getTextArcRadius(BADGE_INNER_R_THICK);

/** Üst yarım: sol → üst → sağ */
export function topArcPathD(r: number, cx = BADGE_CX, cy = BADGE_CY): string {
  return `M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`;
}

/** Alt yarım: sağ → alt → sol (düz okunur) */
export function bottomArcPathD(
  r: number,
  cx = BADGE_CX,
  cy = BADGE_CY,
): string {
  return `M ${cx + r} ${cy} A ${r} ${r} 0 0 0 ${cx - r} ${cy}`;
}

export function updateBadgeTextArcs(
  topPath: SVGPathElement | null,
  bottomPath: SVGPathElement | null,
  innerR: number,
): void {
  const r = getTextArcRadius(innerR);
  topPath?.setAttribute("d", topArcPathD(r));
  bottomPath?.setAttribute("d", bottomArcPathD(r));
}

const TEXT_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-planc), sans-serif",
  fontWeight: 800,
  fontSize: 34,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
};

export const CircularScoreBadge = forwardRef<
  SVGCircleElement,
  CircularScoreBadgeProps
>(function CircularScoreBadge(
  { message, className = "", textRotateRef, topArcPathRef, bottomArcPathRef },
  innerRingRef,
) {
  const uid = useId().replace(/:/g, "");
  const maskId = `badge-mask-${uid}`;
  const topId = `arc-top-${uid}`;
  const bottomId = `arc-bottom-${uid}`;

  return (
    <svg
      width={BADGE_SIZE}
      height={BADGE_SIZE}
      viewBox={`0 0 ${BADGE_SIZE} ${BADGE_SIZE}`}
      className={className}
      aria-hidden
    >
      <defs>
        <mask id={maskId}>
          <rect width={BADGE_SIZE} height={BADGE_SIZE} fill="white" />
          <circle
            ref={innerRingRef}
            cx={BADGE_CX}
            cy={BADGE_CY}
            r={BADGE_INNER_R_BASE}
            fill="black"
          />
        </mask>
        <path
          ref={topArcPathRef}
          id={topId}
          d={topArcPathD(TEXT_ARC_R_BASE)}
          fill="none"
        />
        <path
          ref={bottomArcPathRef}
          id={bottomId}
          d={bottomArcPathD(TEXT_ARC_R_BASE)}
          fill="none"
        />
      </defs>

      <circle
        cx={BADGE_CX}
        cy={BADGE_CY}
        r={BADGE_OUTER_R}
        fill="#1A1A1A"
        mask={`url(#${maskId})`}
      />

      <g ref={textRotateRef} mask={`url(#${maskId})`}>
        <text fill="#FFFFFF" style={TEXT_STYLE}>
          <textPath href={`#${topId}`} startOffset="50%" textAnchor="middle">
            {message.top}
          </textPath>
        </text>
        <text fill="#FFFFFF" style={TEXT_STYLE}>
          <textPath
            href={`#${bottomId}`}
            startOffset="50%"
            textAnchor="middle"
          >
            {`++++ ${message.bottom} ++++`}
          </textPath>
        </text>
      </g>
    </svg>
  );
});

export const BADGE_BAND_THICK_PX = BADGE_OUTER_R - BADGE_INNER_R_THICK;
