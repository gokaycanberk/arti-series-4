"use client";

import Image from "next/image";
import type { CSSProperties } from "react";

type UntitledFileTabProps = {
  label: string;
  leftPct: number;
  topPct: number;
  z: number;
  burstPop: boolean;
  popOffsetX: number;
  popOffsetY: number;
  isExiting: boolean;
  onClose: () => void;
  onFocus: () => void;
};

export function UntitledFileTab({
  label,
  leftPct,
  topPct,
  z,
  burstPop,
  popOffsetX,
  popOffsetY,
  isExiting,
  onClose,
  onFocus,
}: UntitledFileTabProps) {
  return (
    <div
      className={`${burstPop ? "untitled-tab-pop-burst" : "untitled-tab-pop"} absolute flex w-[min(92vw,22.5rem)] max-w-[22.5rem] items-center gap-2 overflow-hidden border border-black bg-white px-3 py-2.5 ${
        isExiting ? "pointer-events-none opacity-0 transition-opacity duration-150" : ""
      }`}
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        zIndex: z,
        fontFamily: "var(--font-planc), serif",
        ...(burstPop
          ? ({
              "--pop-tx": `${popOffsetX}px`,
              "--pop-ty": `${popOffsetY}px`,
            } as CSSProperties)
          : undefined),
      }}
      onPointerDown={onFocus}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="relative size-[27px] shrink-0 transition-opacity hover:opacity-70"
        aria-label={`${label} sekmesini kapat`}
      >
        <Image
          src="/games/untitled-project/close-icon.svg"
          alt=""
          fill
          className="object-contain"
          sizes="27px"
          draggable={false}
        />
      </button>
      <p
        className="min-w-0 truncate text-[20px] leading-[23px] text-black"
        title={label}
      >
        {label}
      </p>
    </div>
  );
}
