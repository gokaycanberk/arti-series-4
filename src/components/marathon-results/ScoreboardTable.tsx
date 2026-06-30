"use client";

import type { LeaderboardEntry } from "@/lib/mockLeaderboard";
import {
  PLAYER_CARD_W,
  SCOREBOARD_ROW_H,
} from "@/components/marathon-results/constants";

interface ScoreboardTableProps {
  entries: LeaderboardEntry[];
  className?: string;
}

function formatHex(hex: string): string {
  const normalized = hex.startsWith("#") ? hex : `#${hex}`;
  return normalized.toUpperCase();
}

function formatScore(score: number): string {
  return String(score);
}

const cellStyle = {
  fontFamily: "var(--font-planc), serif",
  color: "#1A1A1A",
} as const;

/** Figma: 67 | 89 | 304 | 138 = 598px — border-collapse ile taşma yok */
export function ScoreboardTable({ entries, className = "" }: ScoreboardTableProps) {
  return (
    <table
      className={`border-collapse border border-[#1A1A1A] bg-[#E5E5E5] ${className}`}
      style={{ width: PLAYER_CARD_W, tableLayout: "fixed" }}
    >
      <thead>
        <tr>
          <th
            colSpan={4}
            className="border-b border-[#1A1A1A] bg-[#E5E5E5] text-center font-extrabold"
            style={{ ...cellStyle, height: 56, fontSize: 20 }}
          >
            SCOREBOARD
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.rank} style={{ height: SCOREBOARD_ROW_H }}>
            <td
              className="border-b border-r border-[#1A1A1A] bg-[#E5E5E5] text-center font-extrabold"
              style={{ ...cellStyle, width: 67, fontSize: 20 }}
            >
              {entry.rank}⚑
            </td>
            <td
              className="border-b border-r border-[#1A1A1A] text-center"
              style={{ width: 89, backgroundColor: entry.accent }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/Avatar_Set/face/face.png"
                alt=""
                className="mx-auto rounded-full border border-[#1A1A1A] bg-[#E5E5E5] object-cover"
                style={{ width: 42, height: 42 }}
              />
            </td>
            <td
              className="border-b border-r border-[#1A1A1A] bg-[#E5E5E5] pl-3"
              style={{ ...cellStyle, width: 304, fontSize: 20, fontWeight: 450 }}
            >
              <span className="truncate">
                <span style={{ fontWeight: 800 }}>HEX</span>
                {formatHex(entry.hex)}
              </span>
            </td>
            <td
              className="border-b border-[#1A1A1A] bg-[#E5E5E5] text-center font-extrabold tabular-nums"
              style={{
                ...cellStyle,
                width: 138,
                fontSize: 20,
                letterSpacing: "0.14em",
              }}
            >
              {formatScore(entry.score)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
