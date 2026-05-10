"use client";

import type { GameShellChildState } from "./GameShell";

interface PlaceholderMiniGameProps {
  gameName: string;
  shell: GameShellChildState;
}

/**
 * Henüz mekanik olmayan mini oyunlar için geçici arayüz — Canvas tabanı buraya oturacak.
 */
export function PlaceholderMiniGame({ gameName, shell }: PlaceholderMiniGameProps) {
  return (
    <div
      className={`flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-subtle bg-white py-16 text-center transition-opacity ${
        shell.isPlaying ? "opacity-100" : "opacity-75"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.35em] text-foreground/40">
        Yakında Canvas
      </p>
      <p className="text-3xl font-semibold tracking-tight">{gameName}</p>
      <p className="max-w-lg text-base leading-relaxed text-foreground/60">
        Bu oyun henüz geliştirilmedi — başladığında zamanlayıcı çalışır; süre bittiğinde yer
        tutucu skor atanır (50–100 arası).
      </p>
      {shell.isPlaying ? (
        <p className="text-xs text-foreground/45">
          Oyun sırasında: <span className="font-semibold">{shell.timeLeft}s</span> kaldı.
        </p>
      ) : null}
    </div>
  );
}
