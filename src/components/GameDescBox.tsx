import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { SHELL_PANEL_INSET_X, SHELL_PANEL_TOP } from "@/lib/gameShellLayout";

export const DESC_BOX_TOP = SHELL_PANEL_TOP;
export const DESC_BOX_LEFT = SHELL_PANEL_INSET_X;

const INK = "#1A1A1A";

export interface GameDescBoxProps {
  title: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** Figma sol oyun kutusu — inline-flex, 16×20 padding, 2px gap */
export const GameDescBox = forwardRef<HTMLDivElement, GameDescBoxProps>(
  function GameDescBox({ title, children, className, style }, ref) {
    return (
      <div
        ref={ref}
        className={`absolute z-10 ${className ?? ""}`}
        style={{
          top: DESC_BOX_TOP,
          left: DESC_BOX_LEFT,
          opacity: 0,
          display: "inline-flex",
          padding: "16px 20px",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 2,
          backgroundColor: "#E5E5E5",
          border: `1px solid ${INK}`,
          maxWidth: 222,
          ...style,
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-planc), serif",
            fontWeight: 700,
            fontSize: 20,
            lineHeight: "16px",
            color: INK,
          }}
        >
          {title}
        </p>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-planc), serif",
            fontWeight: 400,
            fontSize: 12,
            lineHeight: "16px",
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
