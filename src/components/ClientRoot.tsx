"use client";

import type { PropsWithChildren } from "react";
import { useLayoutEffect } from "react";

import { useGameStore } from "@/stores/gameStore";

/**
 * Stem layout — modallar ve global navigasyon; sayfa içerikleri `children` olarak gelir.
 */
export function ClientRoot({ children }: PropsWithChildren) {
  const hydrateNicknameFromStorage = useGameStore(
    (s) => s.hydrateNicknameFromStorage,
  );

  useLayoutEffect(() => {
    hydrateNicknameFromStorage();
  }, [hydrateNicknameFromStorage]);

  return (
    <>
      <div className="flex min-h-screen flex-col bg-background">
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </>
  );
}
