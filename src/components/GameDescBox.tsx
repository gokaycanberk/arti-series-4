"use client";

import Image from "next/image";
import { forwardRef, type CSSProperties, type ReactNode } from "react";
import {
  SHELL_PANEL_INSET_X,
  SHELL_PANEL_TOP,
  SHELL_STROKE,
  DESC_BOX_WIDTH,
} from "@/lib/gameShellLayout";
import { getGameIntroBrand } from "@/lib/gameIntroBrands";

export const DESC_BOX_TOP = SHELL_PANEL_TOP;
export const DESC_BOX_LEFT = SHELL_PANEL_INSET_X;
export { DESC_BOX_WIDTH };

/** Başlık (logo PNG) ↔ açıklama arası — Figma 2px → artırıldı */
export const DESC_BOX_TITLE_GAP = 10;
/** Eski 20px başlık − 2px */
export const DESC_BOX_LOGO_H = 18;
/** Eski 12px gövde − 2px */
export const DESC_BOX_BODY_FONT = 10;
export const DESC_BOX_BODY_LINE = 14;

const INK = "#1A1A1A";

export interface GameDescBoxProps {
  gameId: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** Figma sol oyun kutusu — intro ile aynı logo PNG, kompakt boyut */
export const GameDescBox = forwardRef<HTMLDivElement, GameDescBoxProps>(
  function GameDescBox({ gameId, children, className, style }, ref) {
    const brand = getGameIntroBrand(gameId);

    return (
      <div
        ref={ref}
        className={`absolute z-10 ${className ?? ""}`}
        style={{
          top: DESC_BOX_TOP,
          left: DESC_BOX_LEFT,
          display: "inline-flex",
          padding: "16px 20px",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: DESC_BOX_TITLE_GAP,
          backgroundColor: "#E5E5E5",
          border: SHELL_STROKE,
          width: DESC_BOX_WIDTH,
          boxSizing: "border-box",
          ...style,
        }}
      >
        {brand ? (
          <div
            className="flex w-full shrink-0 items-start overflow-hidden leading-none"
            style={{ height: DESC_BOX_LOGO_H }}
          >
            <Image
              src={brand.logoSrc}
              alt=""
              width={640}
              height={120}
              className="block h-full w-auto max-w-full object-contain object-left"
              draggable={false}
            />
          </div>
        ) : null}
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-planc), serif",
            fontWeight: 400,
            fontSize: DESC_BOX_BODY_FONT,
            lineHeight: `${DESC_BOX_BODY_LINE}px`,
            color: INK,
            whiteSpace: "pre-line",
          }}
        >
          {children}
        </p>
      </div>
    );
  },
);
