"use client";

import {
  MARATHON_MAIN_GAMES,
  marathonAvatarPercent,
  marathonSubdivisions,
} from "@/lib/marathon";

interface MarathonProgressBarProps {
  /** Tamamlanan maraton adımı (0 … totalSteps) */
  step: number;
}

const BAR_HEIGHT = 12;
const AVATAR_SIZE = 42;
/** Figma: oyun içi küçük ayırıcı — bar yüksekliğinin yarısı, ortada */
const INNER_TICK_HEIGHT = 6;

export function MarathonProgressBar({ step }: MarathonProgressBarProps) {
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
          border: "1px solid #1A1A1A",
          background: "linear-gradient(90deg, #DAE7FF 0%, #95A8D2 100%)",
        }}
      >
        {/* 5 ana oyun segmenti — eşit genişlik */}
        {Array.from({ length: MARATHON_MAIN_GAMES }).map((_, segmentIndex) => {
          const subs = marathonSubdivisions(segmentIndex);

          return (
            <div
              key={segmentIndex}
              className="relative min-w-0 flex-1"
              style={{ height: "100%" }}
            >
              {/* (1) Oyun içi ayırıcı — kısa çizgi, aynı oyunun 3 turu */}
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
        className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${avatarLeft}%`, transition: "left 0.5s ease" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- GSAP progress avatar */}
        <img
          src="/Avatar_Set/face/face.png"
          alt=""
          className="rounded-full border border-[#1A1A1A] bg-[#E5E5E5]"
          style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
        />
      </div>
    </div>
  );
}
