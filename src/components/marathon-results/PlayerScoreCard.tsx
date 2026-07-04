"use client";

import type { RefObject } from "react";
import {
  PLAYER_AVATAR_FACE_SCALE,
  PLAYER_AVATAR_PX,
  PLAYER_CARD_BOTTOM_H,
  PLAYER_CARD_H,
  PLAYER_CARD_LEFT_W,
  PLAYER_CARD_RIGHT_W,
  PLAYER_CARD_TOP_H,
  PLAYER_CARD_W,
} from "@/components/marathon-results/constants";
import { useGameStore } from "@/stores/gameStore";

export interface PlayerScoreCardRefs {
  root?: RefObject<HTMLDivElement | null>;
  avatar?: RefObject<HTMLDivElement | null>;
  hex?: RefObject<HTMLDivElement | null>;
  label?: RefObject<HTMLDivElement | null>;
  score?: RefObject<HTMLDivElement | null>;
}

interface PlayerScoreCardProps {
  hex: string;
  score: number;
  className?: string;
  refs?: PlayerScoreCardRefs;
}

function formatHex(hex: string): string {
  const normalized = hex.startsWith("#") ? hex : `#${hex}`;
  return normalized.toUpperCase();
}

export function PlayerScoreCard({
  hex,
  score,
  className = "",
  refs,
}: PlayerScoreCardProps) {
  const avatarFaceSrc = useGameStore((s) => s.avatarFaceSrc);
  const displayHex = formatHex(hex);
  const scoreText = String(score);

  return (
    <div
      ref={refs?.root}
      className={`box-border shrink-0 overflow-hidden border border-[#1A1A1A] bg-[#E5E5E5] ${className}`}
      style={{
        width: PLAYER_CARD_W,
        height: PLAYER_CARD_H,
        display: "grid",
        gridTemplateColumns: `${PLAYER_CARD_LEFT_W}px ${PLAYER_CARD_RIGHT_W}px`,
        gridTemplateRows: `${PLAYER_CARD_TOP_H}px ${PLAYER_CARD_BOTTOM_H}px`,
      }}
    >
      <div
        ref={refs?.avatar}
        className="box-border flex items-center justify-center border-b border-r border-[#1A1A1A]"
        style={{ backgroundColor: displayHex, gridColumn: 1, gridRow: 1 }}
      >
        <div
          className="overflow-hidden rounded-full border border-[#1A1A1A] bg-[#E5E5E5]"
          style={{ width: PLAYER_AVATAR_PX, height: PLAYER_AVATAR_PX }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarFaceSrc}
            alt=""
            className="h-full w-full object-cover"
            style={{
              transform: `scale(${PLAYER_AVATAR_FACE_SCALE})`,
              transformOrigin: "center center",
            }}
          />
        </div>
      </div>

      <div
        ref={refs?.hex}
        className="box-border flex items-center justify-center border-b border-[#1A1A1A] pl-[9px]"
        style={{ backgroundColor: displayHex, gridColumn: 2, gridRow: 1 }}
      >
        <span
          className="intro-hex-text whitespace-nowrap text-[#1A1A1A]"
          style={{
            fontFamily: "var(--font-planc), serif",
            fontSize: 35,
            lineHeight: "16px",
          }}
        >
          <span style={{ fontWeight: 800 }}>HEX</span>
          <span style={{ fontWeight: 450 }}>{displayHex}</span>
        </span>
      </div>

      <div
        ref={refs?.label}
        className="box-border flex items-center justify-center border-r border-[#1A1A1A] bg-[#E5E5E5] pl-[12px]"
        style={{ gridColumn: 1, gridRow: 2 }}
      >
        <span
          className="whitespace-nowrap text-[#1A1A1A]"
          style={{
            fontFamily: "var(--font-planc), serif",
            fontWeight: 800,
            fontSize: 35,
            lineHeight: "16px",
          }}
        >
          YOU SCORED:
        </span>
      </div>

      <div
        ref={refs?.score}
        className="box-border flex items-center justify-center bg-[#E5E5E5] px-[32px]"
        style={{ gridColumn: 2, gridRow: 2 }}
      >
        <span
          className="tabular-nums text-[#1A1A1A]"
          style={{
            fontFamily: "var(--font-planc), serif",
            fontWeight: 800,
            fontSize: 35,
            letterSpacing: "4.9px",
            lineHeight: "16px",
          }}
        >
          {scoreText}
        </span>
      </div>
    </div>
  );
}
