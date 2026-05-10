"use client";

import { TOTAL_GAMES } from "@/lib/games";
import { selectMarathonAverage, useGameStore } from "@/stores/gameStore";

/** Global skor tablosu için placeholder sahne — Supabase entegrasyonundan sonra dolacak. */
export default function LeaderboardPage() {
  const nickname = useGameStore((s) => s.nickname);
  const marathonScores = useGameStore((s) => s.marathonScores);
  const mode = useGameStore((s) => s.mode);
  const marathonAverage = useGameStore(selectMarathonAverage);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 px-4 py-16">
      <header className="space-y-3 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-foreground/45">
          Liderlik
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Küresel Sıralama
        </h1>
        <p className="text-sm text-foreground/60">
          Supabase bağlandığında canlı yükleme yapılır; şimdilik cihazdaki oturumu gösteriyoruz.
        </p>
      </header>

      <section className="rounded-3xl border border-subtle bg-white px-8 py-10 shadow-card space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-subtle pb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-foreground/40">
              Oyuncu
            </p>
            <p className="mt-3 text-xl font-semibold">
              {nickname ?? "Nickname bekleniyor"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.3em] text-foreground/40">
              Aktif oturum
            </p>
            <p className="mt-3 text-xl font-semibold">
              Son mod:{" "}
              <span className="text-accent">
                {mode === "marathon"
                  ? "Maraton"
                  : mode === "free"
                    ? "Serbest"
                    : "Seçim yok"}
              </span>
            </p>
          </div>
        </div>

        <dl className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-subtle p-5">
            <dt className="text-xs uppercase tracking-[0.25em] text-foreground/40">
              Ortalama
            </dt>
            <dd className="mt-4 text-3xl font-semibold text-accent">
              {marathonScores.length === 0
                ? "—"
                : marathonAverage.toFixed(2)}
            </dd>
          </div>
          <div className="rounded-2xl border border-subtle p-5">
            <dt className="text-xs uppercase tracking-[0.25em] text-foreground/40">
              Kayıtlı Tur
            </dt>
            <dd className="mt-4 text-3xl font-semibold">{marathonScores.length}</dd>
          </div>
          <div className="rounded-2xl border border-subtle p-5">
            <dt className="text-xs uppercase tracking-[0.25em] text-foreground/40">
              Beklenen
            </dt>
            <dd className="mt-4 text-3xl font-semibold">{TOTAL_GAMES}</dd>
          </div>
        </dl>

        <div className="rounded-2xl border border-dashed border-accent/45 bg-accent/10 p-5 text-xs text-accent">
          Yakında • Supabase `leaderboard_entries` tablosundan canlı sıralama.
        </div>
      </section>
    </div>
  );
}
