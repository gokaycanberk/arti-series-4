"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

import { TOTAL_GAMES } from "@/lib/games";
import { useGameStore } from "@/stores/gameStore";

/** Maraton girişi — takma adı doğrulanır ve mağaza temiz sıfırdan başlar. */
export default function MarathonLandingPage() {
  const router = useRouter();

  const nickname = useGameStore((s) => s.nickname);
  const setNickname = useGameStore((s) => s.setNickname);
  const resetMarathon = useGameStore((s) => s.resetMarathon);
  const setMode = useGameStore((s) => s.setMode);

  /** Mağaza dolduktan sonra varsayılan değeri tazelemek için `key`. */
  const nicknameSeed = nickname ?? "";

  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleStart = () => {
    const typed = inputRef.current?.value.trim() ?? "";
    const candidate = typed.length > 0 ? typed : nickname?.trim();

    if (!candidate) return;

    if (candidate !== nickname) {
      setNickname(candidate);
    }

    resetMarathon();
    setMode("marathon");
    router.push("/marathon/1");
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center px-4 py-20">
      <div className="w-full space-y-4 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-foreground/45">
          Maraton Modu
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          On oyun sırayla
        </h1>
        <p className="text-base leading-relaxed text-foreground/60">
          Süreleri tamamla ve skorlarını gör; maraton ortalaması serinin sonunda
          sıralamalara hazırlanıyoruz.
        </p>
      </div>

      <div className="mt-14 w-full space-y-8">
        <div className="space-y-3 text-left">
          <label
            htmlFor="marathon-nickname"
            className="block text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50"
          >
            Takma Ad
          </label>
          <input
            id="marathon-nickname"
            key={nicknameSeed || "missing-nickname"}
            ref={inputRef}
            defaultValue={nicknameSeed}
            className="w-full rounded-xl border border-subtle bg-white px-4 py-3 text-sm outline-none ring-foreground/10 transition focus:ring-2"
            placeholder="Örn: grid_master"
          />
          <p className="text-xs text-foreground/45">
            Giriş sırasında alınan nickname otomatik dolar; gerekiyorsa burada güncelleyebilirsin.
          </p>
        </div>

        <button
          type="button"
          onClick={handleStart}
          className="w-full rounded-full bg-foreground py-4 text-center text-sm font-semibold uppercase tracking-[0.2em] text-background transition hover:opacity-90"
        >
          Maratonu Başlat
        </button>

        <p className="text-center text-xs text-foreground/45">
          Toplam {TOTAL_GAMES} oyun • skorların ortalaması maraton sırasında canlı olarak
          güncellenir.
        </p>
      </div>
    </div>
  );
}
