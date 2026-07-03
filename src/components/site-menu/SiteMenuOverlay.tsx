"use client";

import gsap from "gsap";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  MENU_BLUR_BG,
  MENU_BLUR_PX,
  MENU_FONT_SIZE,
  MENU_ITEM_ENTER_DURATION,
  MENU_ITEM_EXIT_DURATION,
  MENU_ITEM_STAGGER,
  MENU_ITEM_TOPS,
  MENU_ITEMS,
  MENU_LEFT,
} from "./constants";
import { useSiteMenu } from "./SiteMenuContext";
import { WhyPanel } from "./WhyPanel";

export function SiteMenuOverlay() {
  const router = useRouter();
  const { view, closeAll, openWhy, lockRef } = useSiteMenu();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [itemsInteractive, setItemsInteractive] = useState(false);

  const blurRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const prevViewRef = useRef(view);
  const enterTlRef = useRef<gsap.core.Timeline | null>(null);
  const exitTlRef = useRef<gsap.core.Timeline | null>(null);

  const menuVisible = view === "menu" || view === "why";

  const animateMenuIn = useCallback(() => {
    enterTlRef.current?.kill();
    const items = itemRefs.current.filter(Boolean);
    if (!items.length) return;

    lockRef.current = true;
    setItemsInteractive(false);
    gsap.set(items, { x: "-120vw", opacity: 1 });

    const tl = gsap.timeline({
      onComplete: () => {
        lockRef.current = false;
        setItemsInteractive(true);
      },
    });
    enterTlRef.current = tl;

    tl.to(
      items,
      {
        x: 0,
        duration: MENU_ITEM_ENTER_DURATION,
        ease: "power3.out",
        stagger: MENU_ITEM_STAGGER,
      },
      0.15,
    );
  }, [lockRef]);

  const animateMenuOut = useCallback(
    (onComplete?: () => void) => {
      exitTlRef.current?.kill();
      const items = itemRefs.current.filter(Boolean);
      if (!items.length) {
        onComplete?.();
        return;
      }

      lockRef.current = true;
      setItemsInteractive(false);

      const tl = gsap.timeline({
        onComplete: () => {
          gsap.set(items, { opacity: 0 });
          lockRef.current = false;
          onComplete?.();
        },
      });
      exitTlRef.current = tl;

      tl.to(
        items,
        {
          x: "-120vw",
          duration: MENU_ITEM_EXIT_DURATION,
          ease: "power2.inOut",
          stagger: MENU_ITEM_STAGGER,
        },
        0,
      );
    },
    [lockRef],
  );

  const animateMenuBackIn = useCallback(() => {
    enterTlRef.current?.kill();
    const items = itemRefs.current.filter(Boolean);
    if (!items.length) return;

    lockRef.current = true;
    setItemsInteractive(false);
    gsap.set(items, { x: "-120vw", opacity: 1 });

    const tl = gsap.timeline({
      onComplete: () => {
        lockRef.current = false;
        setItemsInteractive(true);
      },
    });
    enterTlRef.current = tl;

    tl.to(
      items,
      {
        x: 0,
        duration: MENU_ITEM_ENTER_DURATION,
        ease: "power3.out",
        stagger: MENU_ITEM_STAGGER,
      },
      0.2,
    );
  }, [lockRef]);

  useEffect(() => {
    if (menuVisible) {
      document.body.style.overflow = "hidden";
    } else if (!document.body.dataset.introActive) {
      document.body.style.overflow = "";
    }
    return () => {
      if (!document.body.dataset.introActive) {
        document.body.style.overflow = "";
      }
    };
  }, [menuVisible]);

  useLayoutEffect(() => {
    const items = itemRefs.current.filter(Boolean);
    gsap.set(items, { x: "-120vw", opacity: 0 });
  }, []);

  useLayoutEffect(() => {
    const blur = blurRef.current;
    if (!blur) return;

    if (menuVisible) {
      gsap.to(blur, {
        opacity: 1,
        duration: 0.45,
        ease: "power2.out",
        pointerEvents: "auto",
      });
    } else {
      gsap.to(blur, {
        opacity: 0,
        duration: 0.35,
        ease: "power2.in",
        pointerEvents: "none",
      });
    }
  }, [menuVisible]);

  useEffect(() => {
    const prev = prevViewRef.current;
    prevViewRef.current = view;

    if (prev === "closed" && view === "menu") {
      animateMenuIn();
    } else if (prev === "menu" && view === "closed") {
      animateMenuOut();
    } else if (prev === "why" && view === "menu") {
      animateMenuBackIn();
    } else if (prev === "why" && view === "closed") {
      animateMenuOut();
    }
  }, [view, animateMenuIn, animateMenuOut, animateMenuBackIn]);

  const handleItemClick = (item: (typeof MENU_ITEMS)[number]) => {
    if (lockRef.current || !itemsInteractive) return;

    if (item.id === "why") {
      animateMenuOut(() => openWhy());
      return;
    }

    if (item.id === "home") {
      closeAll();
      if (window.location.pathname !== "/") {
        router.push("/");
      }
      return;
    }

    if (item.href && item.external) {
      window.open(item.href, "_blank", "noopener,noreferrer");
    }
  };

  const handleBlurClick = () => {
    if (view === "why") return;
    closeAll();
  };

  return (
    <>
      <div
        ref={blurRef}
        className="fixed inset-0 opacity-0"
        style={{
          zIndex: 45,
          backdropFilter: `blur(${MENU_BLUR_PX}px)`,
          WebkitBackdropFilter: `blur(${MENU_BLUR_PX}px)`,
          backgroundColor: MENU_BLUR_BG,
        }}
        onClick={handleBlurClick}
        aria-hidden={!menuVisible}
      />

      <nav
        className="pointer-events-none fixed inset-0 overflow-hidden"
        style={{ zIndex: 50 }}
        aria-hidden={view !== "menu" && view !== "why"}
      >
        {MENU_ITEMS.map((item, index) => {
          const isHovered = hoveredId === item.id;
          const topPx = MENU_ITEM_TOPS[index];
          const topPct = (topPx / 1080) * 100;

          return (
            <button
              key={item.id}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              type="button"
              onClick={() => handleItemClick(item)}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`menu-item-label pointer-events-auto absolute cursor-pointer border-0 bg-transparent p-0 text-left ${
                isHovered ? "menu-item-label--hover" : ""
              }`}
              style={{
                left: MENU_LEFT,
                top: `${topPct}vh`,
                fontSize: `clamp(72px, ${(MENU_FONT_SIZE / 1080) * 100}vh, ${MENU_FONT_SIZE}px)`,
                opacity: 0,
                transform: "translateX(-120vw)",
                pointerEvents:
                  view === "menu" && itemsInteractive ? "auto" : "none",
              }}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      <WhyPanel />
    </>
  );
}
