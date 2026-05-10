"use client";

import Link from "next/link";

import type { Game } from "@/types";

function difficultyDots(difficulty: Game["difficulty"]) {
  const map = { easy: 1, medium: 2, hard: 3 } as const;
  return map[difficulty];
}

function CategoryBadge({ category }: { category: Game["category"] }) {
  return (
    <span className="rounded-full bg-subtle px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-foreground/70">
      {category}
    </span>
  );
}

interface GameCardProps {
  game: Game;
  href: string;
  /** Rota seçilmeden hemen tetiklenecek isteğe bağlı istemci aksiyonu. */
  onNavigate?: () => void;
}

export function GameCard({ game, href, onNavigate }: GameCardProps) {
  const dots = difficultyDots(game.difficulty);

  return (
    <Link
      href={href}
      onClick={() => onNavigate?.()}
      className="group flex h-full flex-col justify-between rounded-2xl border border-subtle bg-white p-5 shadow-none transition hover:-translate-y-0.5 hover:shadow-card"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold tracking-tight">{game.name}</h3>
          <CategoryBadge category={game.category} />
        </div>
        <p className="text-sm leading-relaxed text-foreground/60">
          {game.description}
        </p>
      </div>
      <div className="mt-6 flex items-center gap-2" aria-hidden>
        {Array.from({ length: 3 }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-6 rounded-full ${
              i < dots ? "bg-foreground" : "bg-subtle"
            }`}
          />
        ))}
      </div>
    </Link>
  );
}
