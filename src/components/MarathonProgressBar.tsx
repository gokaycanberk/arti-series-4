"use client";

import {
  MARATHON_MAIN_GAMES,
  marathonAvatarPercent,
  marathonSubdivisions,
} from "@/lib/marathon";
import { SHELL_STROKE } from "@/lib/gameShellLayout";
import { useGameStore } from "@/stores/gameStore";

interface MarathonProgressBarProps {
  /** Tamamlanan maraton adımı (0 … totalSteps) */
  step: number;
}

const BAR_HEIGHT = 12;
const AVATAR_SIZE = 42;
/** Figma: oyun içi küçük ayırıcı — bar yüksekliğinin yarısı, ortada */
const INNER_TICK_HEIGHT = 6;

export function MarathonProgressBar({ step }: MarathonProgressBarProps) {
  const avatarFaceSrc = useGameStore((s) => s.avatarFaceSrc);
  const avatarLeft = marathonAvatarPercent(step);

  return (
    <div
      className="relative w-full"
      style={{ height: AVATAR_SIZE, paddingTop: (AVATAR_SIZE - BAR_HEIGHT) / 2 }}
    >
      <div
        className="relative flex w-full"
        style={{
          height: BAR_HEIGHT,
          border: SHELL_STROKE,
          background: "transparent",
        }}
      >
        {/* İlerleme dolgusu — gradient tüm bar boyunca sabit, sadece
            tamamlanan kısım açığa çıkar (kalan kısım transparan) */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "linear-gradient(90deg, #DAE7FF 0%, #95A8D2 100%)",
            clipPath: `inset(0 ${100 - avatarLeft}% 0 0)`,
            transition: "clip-path 0.5s ease",
          }}
        />

        {/* 5 ana oyun segmenti — eşit genişlik */}
        {Array.from({ length: MARATHON_MAIN_GAMES }).map((_, segmentIndex) => {
          const subs = marathonSubdivisions(segmentIndex);

          return (
            <div
              key={segmentIndex}
              className="relative min-w-0 flex-1"
              style={{ height: "100%" }}
            >
              {/* Oyun içi ayırıcı — aynı oyunun birden fazla turu varsa */}
              {subs > 1 &&
                Array.from({ length: subs - 1 }).map((__, divIndex) => (
                  <div
                    key={divIndex}
                    className="pointer-events-none absolute top-1/2"
                    style={{
                      left: `${((divIndex + 1) / subs) * 100}%`,
                      width: 1,
                      height: INNER_TICK_HEIGHT,
                      backgroundColor: "#1A1A1A",
                      transform: "translate(-0.5px, -50%)",
                    }}
                  />
                ))}
            </div>
          );
        })}

        {/* (2) Oyunlar arası ayırıcı — tam yükseklik */}
        {Array.from({ length: MARATHON_MAIN_GAMES - 1 }).map((_, i) => (
          <div
            key={`game-${i}`}
            className="pointer-events-none absolute top-0 bottom-0"
            style={{
              left: `${((i + 1) / MARATHON_MAIN_GAMES) * 100}%`,
              width: 1,
              backgroundColor: "#1A1A1A",
              transform: "translateX(-0.5px)",
            }}
          />
        ))}
      </div>

      <div
        id="gs-progress-avatar"
        className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${avatarLeft}%`, transition: "left 0.5s ease" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- GSAP progress avatar */}
        <img
          src={avatarFaceSrc}
          alt=""
          className="rounded-full bg-[#E5E5E5]"
          style={{
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            border: SHELL_STROKE,
            boxSizing: "border-box",
          }}
        />
      </div>
    </div>
  );
}
