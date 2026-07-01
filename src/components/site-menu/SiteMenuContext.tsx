"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

export type SiteMenuView = "closed" | "menu" | "why";

interface SiteMenuContextValue {
  view: SiteMenuView;
  isOpen: boolean;
  toggleMenu: () => void;
  closeAll: () => void;
  openWhy: () => void;
  closeWhy: () => void;
  setView: (view: SiteMenuView) => void;
  /** GSAP animasyonları bitene kadar kapatmayı erteler */
  lockRef: React.MutableRefObject<boolean>;
}

const SiteMenuContext = createContext<SiteMenuContextValue | null>(null);

export function SiteMenuProvider({ children }: PropsWithChildren) {
  const [view, setView] = useState<SiteMenuView>("closed");
  const lockRef = useRef(false);

  const toggleMenu = useCallback(() => {
    if (lockRef.current) return;
    setView((prev) => (prev === "closed" ? "menu" : "closed"));
  }, []);

  const closeAll = useCallback(() => {
    if (lockRef.current) return;
    setView("closed");
  }, []);

  const openWhy = useCallback(() => {
    if (lockRef.current) return;
    setView("why");
  }, []);

  const closeWhy = useCallback(() => {
    if (lockRef.current) return;
    setView("menu");
  }, []);

  const value = useMemo(
    () => ({
      view,
      isOpen: view !== "closed",
      toggleMenu,
      closeAll,
      openWhy,
      closeWhy,
      setView,
      lockRef,
    }),
    [view, toggleMenu, closeAll, openWhy, closeWhy],
  );

  return (
    <SiteMenuContext.Provider value={value}>{children}</SiteMenuContext.Provider>
  );
}

export function useSiteMenu() {
  const ctx = useContext(SiteMenuContext);
  if (!ctx) {
    throw new Error("useSiteMenu must be used within SiteMenuProvider");
  }
  return ctx;
}

export function useSiteMenuOptional() {
  return useContext(SiteMenuContext);
}
