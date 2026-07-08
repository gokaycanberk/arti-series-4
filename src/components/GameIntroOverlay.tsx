"use client";

import Image from "next/image";
import { forwardRef, type CSSProperties } from "react";

import PressButton from "@/components/PressButton";
import {
  INTRO_CARD_HEIGHT,
  INTRO_CARD_LOGO_H,
  INTRO_CARD_SECTION_GAP,
  INTRO_CARD_WIDTH,
  INTRO_CARD_Y_OFFSET,
  INTRO_PLAY_BUTTON_H,
  INTRO_PLAY_BUTTON_SLOT_H,
  INTRO_PLAY_BUTTON_W,
} from "@/lib/gameIntro";
import { getGameIntroBrand } from "@/lib/gameIntroBrands";
import { SHELL_INK, SHELL_STROKE_WIDTH } from "@/lib/gameShellLayout";

/** Intro kartı arka plan şekli — 1132×509 referans, 1100×500’e ölçeklenir */
const INTRO_CARD_PATH =
  "M565.947 0.5C641.552 0.500003 714.915 6.99987 783.996 19.8232C850.904 32.2399 911.047 50.0432 962.754 72.7295C1014.99 95.6435 1056.09 122.455 1084.96 152.403C1115.8 184.39 1131.39 218.626 1131.39 254.157C1131.39 289.688 1115.8 323.923 1084.96 355.91C1056.09 385.858 1014.99 412.67 962.754 435.584C911.047 458.27 850.904 476.075 783.996 488.491C714.915 501.309 641.552 507.813 565.947 507.813C490.343 507.813 416.98 501.315 347.898 488.491C280.99 476.075 220.847 458.27 169.141 435.584C116.908 412.67 75.8001 385.858 46.9316 355.91C16.0937 323.923 0.500094 289.688 0.5 254.157C0.5 218.626 16.0936 184.39 46.9316 152.403C75.8002 122.455 116.908 95.6435 169.141 72.7295C220.847 50.0432 280.99 32.2399 347.898 19.8232C416.98 7.00569 490.343 0.5 565.947 0.5Z";

const INTRO_CARD_VIEWBOX = "0 0 1132 509";

const sectionSpacerStyle: CSSProperties = {
  flexShrink: 0,
  width: "100%",
  height: INTRO_CARD_SECTION_GAP,
  minHeight: INTRO_CARD_SECTION_GAP,
};

export interface GameIntroOverlayProps {
  gameId: string;
  description: string;
  playEnabled?: boolean;
  playPressed?: boolean;
  onPlay?: () => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Oyun başlangıcında yukarı/aşağı kayan intro kartı — Figma Desktop-219 (442:12).
 */
export const GameIntroOverlay = forwardRef<HTMLDivElement, GameIntroOverlayProps>(
  function GameIntroOverlay(
    {
      gameId,
      description,
      playEnabled = false,
      playPressed = false,
      onPlay,
      className = "",
      style,
    },
    ref,
  ) {
    const brand = getGameIntroBrand(gameId);
    if (!brand) return null;

    const yOffset = INTRO_CARD_Y_OFFSET[gameId] ?? 0;
    const canInteract = playEnabled && !playPressed;

    return (
      <div
        className={`absolute inset-0 z-30 flex items-center justify-center ${
          canInteract || playPressed ? "pointer-events-auto" : "pointer-events-none"
        } ${className}`}
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
              stroke={SHELL_INK}
              strokeWidth={SHELL_STROKE_WIDTH}
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <div className="relative z-10 flex w-full flex-col items-center">
            <div
              className="flex w-full shrink-0 items-start justify-center overflow-hidden leading-none"
              style={{ height: INTRO_CARD_LOGO_H }}
            >
              <Image
                src={brand.logoSrc}
                alt=""
                width={640}
                height={120}
                className="block h-full w-auto max-w-[min(580px,72%)] object-contain object-top"
                draggable={false}
                priority
              />
            </div>

            <div aria-hidden style={sectionSpacerStyle} />

            <p
              className="mx-auto max-w-[780px] shrink-0 text-pretty text-black"
              style={{
                margin: 0,
                fontFamily: "var(--font-planc), serif",
                fontWeight: 300,
                fontSize: "clamp(16px, 2vw, 28px)",
                lineHeight: 1.35,
              }}
            >
              {description}
            </p>

            <div aria-hidden style={sectionSpacerStyle} />

            <div
              className="flex w-full shrink-0 items-start justify-center"
              style={{ minHeight: INTRO_PLAY_BUTTON_SLOT_H }}
            >
              <PressButton
                label="PLAY!"
                onClick={onPlay}
                width={INTRO_PLAY_BUTTON_W}
                height={INTRO_PLAY_BUTTON_H}
                holdAfterClick
              />
            </div>
          </div>
        </div>
      </div>
    );
  },
);
