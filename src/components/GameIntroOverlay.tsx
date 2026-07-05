"use client";

import Image from "next/image";
import { forwardRef, type CSSProperties } from "react";

import {
  INTRO_CARD_HEIGHT,
  INTRO_CARD_WIDTH,
  INTRO_CARD_Y_OFFSET,
} from "@/lib/gameIntro";
import { getGameIntroBrand } from "@/lib/gameIntroBrands";

/** Intro kartı arka plan şekli — 1132×509 referans, 1100×500’e ölçeklenir */
const INTRO_CARD_PATH =
  "M565.947 0.5C641.552 0.500003 714.915 6.99987 783.996 19.8232C850.904 32.2399 911.047 50.0432 962.754 72.7295C1014.99 95.6435 1056.09 122.455 1084.96 152.403C1115.8 184.39 1131.39 218.626 1131.39 254.157C1131.39 289.688 1115.8 323.923 1084.96 355.91C1056.09 385.858 1014.99 412.67 962.754 435.584C911.047 458.27 850.904 476.075 783.996 488.491C714.915 501.309 641.552 507.813 565.947 507.813C490.343 507.813 416.98 501.315 347.898 488.491C280.99 476.075 220.847 458.27 169.141 435.584C116.908 412.67 75.8001 385.858 46.9316 355.91C16.0937 323.923 0.500094 289.688 0.5 254.157C0.5 218.626 16.0936 184.39 46.9316 152.403C75.8002 122.455 116.908 95.6435 169.141 72.7295C220.847 50.0432 280.99 32.2399 347.898 19.8232C416.98 7.00569 490.343 0.5 565.947 0.5Z";

const INTRO_CARD_VIEWBOX = "0 0 1132 509";

export interface GameIntroOverlayProps {
  gameId: string;
  description: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Oyun başlangıcında yukarı/aşağı kayan intro kartı — Figma Desktop-219 (442:12).
 */
export const GameIntroOverlay = forwardRef<HTMLDivElement, GameIntroOverlayProps>(
  function GameIntroOverlay({ gameId, description, className = "", style }, ref) {
    const brand = getGameIntroBrand(gameId);
    if (!brand) return null;

    const yOffset = INTRO_CARD_Y_OFFSET[gameId] ?? 0;

    return (
      <div
        className={`pointer-events-none absolute inset-0 z-30 flex items-center justify-center ${className}`}
      >
        <div
          ref={ref}
          className="relative flex flex-col items-center justify-center text-center"
          style={{
            opacity: 0,
            width: `min(${INTRO_CARD_WIDTH}px, 92vw)`,
            height: `min(${INTRO_CARD_HEIGHT}px, calc(92vw * ${INTRO_CARD_HEIGHT / INTRO_CARD_WIDTH}))`,
            marginTop: yOffset,
            padding: "clamp(24px, 4vh, 40px) clamp(24px, 4vw, 56px)",
            ...style,
          }}
        >
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox={INTRO_CARD_VIEWBOX}
            preserveAspectRatio="none"
          >
            <path
              d={INTRO_CARD_PATH}
              fill={brand.fillColor}
              stroke="#000000"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <div className="relative z-10 flex w-full flex-col items-center justify-center">
            <Image
              src={brand.logoSrc}
              alt=""
              width={640}
              height={120}
              className="h-auto w-[min(580px,72%)] max-w-full select-none object-contain"
              draggable={false}
              priority
            />

            <p
              className="mx-auto mt-[clamp(12px,2vh,24px)] max-w-[780px] text-black"
              style={{
                fontFamily: "var(--font-planc), serif",
                fontWeight: 300,
                fontSize: "clamp(16px, 2vw, 28px)",
                lineHeight: 1.35,
                whiteSpace: "pre-line",
              }}
            >
              {description}
            </p>
          </div>
        </div>
      </div>
    );
  },
);
