"use client";

import { useSyncExternalStore } from "react";

/**
 * İstemci hydrasyonu tamamlandı mı? — tarayıcıda güvenle `localStorage`/store okumak için.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {
      // store aboneliği gerekmiyor
    },
    () => true,
    () => false,
  );
}
