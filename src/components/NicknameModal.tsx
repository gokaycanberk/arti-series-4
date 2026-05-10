"use client";

import { useState } from "react";

import { useHydrated } from "@/hooks/useHydrated";
import { NICKNAME_STORAGE_KEY, useGameStore } from "@/stores/gameStore";

/**
 * localStorage anahtarı — mağaza ile uyumlu; boş durumdaysa ilk ziyaret modalı.
 */
function readStoredNickname(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(NICKNAME_STORAGE_KEY)?.trim();
  return raw ?? null;
}

/** İlk yüklemede takma ad toplar ve store ile localStorage’a yazar; blur + minimalist panel. */
export function NicknameModal() {
  const setNickname = useGameStore((s) => s.setNickname);
  const nickname = useGameStore((s) => s.nickname);
  const hydrated = useHydrated();

  const [value, setValue] = useState("");

  const shouldOpen =
    hydrated && !nickname?.trim() && readStoredNickname() == null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setNickname(value);
  };

  if (!shouldOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nickname-heading"
    >
      <div className="w-full max-w-sm rounded-2xl border border-subtle bg-white p-8 shadow-card">
        <h2 id="nickname-heading" className="text-lg font-semibold tracking-tight">
          Hoş geldin
        </h2>
        <p className="mt-2 text-sm text-foreground/60">
          Liderlik tablosu için takma adını gir; istediğin zaman değiştirebilirsin.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            className="w-full rounded-xl border border-subtle px-4 py-3 text-sm outline-none ring-foreground/10 transition focus:ring-2"
            placeholder="ör. tipografi_fan42"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            className="w-full rounded-full bg-foreground py-3 text-sm font-medium text-background transition hover:opacity-90"
          >
            Başla
          </button>
        </form>
      </div>
    </div>
  );
}
