"use client";

import type { PropsWithChildren } from "react";
import { useLayoutEffect } from "react";

import { SiteMenuOverlay, SiteMenuProvider, SiteMenuToggle } from "@/components/site-menu";
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
    <SiteMenuProvider>
      <div className="flex min-h-screen flex-col overflow-x-clip bg-background">
        <main className="flex flex-1 flex-col overflow-x-clip">{children}</main>
      </div>
      <SiteMenuToggle />
      <SiteMenuOverlay />
    </SiteMenuProvider>
  );
}
