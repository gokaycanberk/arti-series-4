"use client";

import { useRouter } from "next/navigation";

import { GameCard } from "@/components/GameCard";
import { GAMES } from "@/lib/games";
import { useGameStore } from "@/stores/gameStore";

/** Ana güzergâh — mod seçimi ve oyun ızgarası. */
export default function HomePage() {
  const router = useRouter();
  const setMode = useGameStore((s) => s.setMode);

  const scrollToGames = () => {
    document.getElementById("games-grid")?.scrollIntoView({ behavior: "smooth" });
  };

  const enterFreePlay = () => {
    setMode("free");
    scrollToGames();
  };

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-14">
      <div className="space-y-4 text-center">
        <p className="text-xs uppercase tracking-[0.45em] text-foreground/45">
          Artı Labs — Series 04
        </p>
        <h1 className="text-balance text-5xl font-semibold tracking-tight sm:text-6xl">
          Artı Series 4
        </h1>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-foreground/60">
          On mini oyun, tek tasarım dili — tipografi ve renk hissini küçük süreçlere böldük.
          Serbest modda seç, ya da bir solukta tamamını bitir.
        </p>

        <div className="mx-auto mt-12 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={enterFreePlay}
            className="rounded-full bg-foreground px-10 py-3 text-center text-sm font-semibold text-background transition hover:opacity-90"
          >
            Serbest Oyna
          </button>
          <button
            type="button"
            onClick={() => {
              router.push("/marathon");
            }}
            className="rounded-full border border-subtle px-10 py-3 text-center text-sm font-semibold transition hover:bg-subtle/60"
          >
            Maratona Katıl
          </button>
        </div>
      </div>

      <section
        id="games-grid"
        className="mx-auto mt-20 scroll-mt-28 space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-subtle pb-4">
          <h2 className="text-xl font-semibold tracking-tight">Mini oyunlar</h2>
          <p className="text-sm text-foreground/50">
            Kartlardan birine dokunarak ilgili oyun sahnesine geçebilirsin.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-5">
          {GAMES.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              href={`/games/${game.id}`}
              onNavigate={() => setMode("free")}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
