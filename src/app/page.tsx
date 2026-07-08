"use client";

import gsap from "gsap";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import FloatingLogos from "@/components/FloatingLogos";
import PressButton from "@/components/PressButton";

/** Figma Desktop-213 — referans MacBook viewport'unda tasarlanan px değerleri */
const INTRO_FINAL_Y = {
  welcome: -297,
  tothe: -81,
  logo: 180,
} as const;

/** Referans viewport (kompozisyonun "tam boy" göründüğü MacBook ölçüsü) */
const INTRO_REF_W = 1500;
const INTRO_REF_H = 820;
/** Küçük ekranda küçülür, büyük ekranda orantılı büyür ama tavanda durur */
const INTRO_MIN_SCALE = 0.5;
const INTRO_MAX_SCALE = 1.2;

/**
 * Tüm intro kompozisyonu (metin + aralık + logo) tek faktörle ölçeklenir.
 * En-boy oranından bağımsız kalması için genişlik/yükseklik oranının küçüğü alınır.
 */
function computeIntroScale(viewportW: number, viewportH: number): number {
  const raw = Math.min(viewportW / INTRO_REF_W, viewportH / INTRO_REF_H);
  return Math.max(INTRO_MIN_SCALE, Math.min(raw, INTRO_MAX_SCALE));
}

/** Referans font (px) — introScale ile çarpılır */
const INTRO_FONT_PX = 210;
/** Referans logo genişliği (px) — introScale ile çarpılır */
const INTRO_LOGO_W = 480;
/** Eşit boşluk / harf görsel yüksekliği oranı — tüm aralıklar bu değere eşit */
const INTRO_GAP_RATIO = 0.62;
const INTRO_LOGO_SRC = "/layers/goodeyelogo.gif";

type LogoBounds = { topRatio: number; bottomRatio: number; aspect: number };
let logoBoundsPromise: Promise<LogoBounds | null> | null = null;

/** Logonun görünür (saydam olmayan) dikey sınırlarını alfa taramasıyla ölç */
function getLogoVisibleBounds(): Promise<LogoBounds | null> {
  if (logoBoundsPromise) return logoBoundsPromise;
  logoBoundsPromise = new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(null);
    const img = new window.Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) return resolve(null);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0);
      let data: Uint8ClampedArray;
      try {
        data = ctx.getImageData(0, 0, w, h).data;
      } catch {
        return resolve(null);
      }
      const alpha = (x: number, y: number) => data[(y * w + x) * 4 + 3] ?? 0;
      let top = -1;
      let bottom = -1;
      for (let y = 0; y < h && top < 0; y++) {
        for (let x = 0; x < w; x++) {
          if (alpha(x, y) > 16) {
            top = y;
            break;
          }
        }
      }
      for (let y = h - 1; y >= 0 && bottom < 0; y--) {
        for (let x = 0; x < w; x++) {
          if (alpha(x, y) > 16) {
            bottom = y;
            break;
          }
        }
      }
      if (top < 0 || bottom < 0) return resolve(null);
      resolve({ topRatio: top / h, bottomRatio: (bottom + 1) / h, aspect: h / w });
    };
    img.onerror = () => resolve(null);
    img.src = INTRO_LOGO_SRC;
  });
  return logoBoundsPromise;
}

let introTextCanvas: HTMLCanvasElement | null = null;

/** Metnin baseline üstü/altı gerçek görsel yüksekliğini (px) ölç */
function measureTextVisual(
  text: string,
  fontWeight: string,
  fontSizePx: number,
  fontFamily: string,
): { ascent: number; descent: number } | null {
  if (typeof document === "undefined") return null;
  if (!introTextCanvas) introTextCanvas = document.createElement("canvas");
  const ctx = introTextCanvas.getContext("2d");
  if (!ctx) return null;
  ctx.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`;
  ctx.textBaseline = "alphabetic";
  const m = ctx.measureText(text);
  const ascent = m.actualBoundingBoxAscent;
  const descent = m.actualBoundingBoxDescent;
  if (!Number.isFinite(ascent) || !Number.isFinite(descent)) return null;
  return { ascent, descent };
}

/** Elemanın baseline'ının viewport y konumu (mevcut transform dahil) */
function measureBaselineY(el: HTMLElement): number {
  const marker = document.createElement("span");
  marker.style.cssText =
    "display:inline-block;width:0;height:0;vertical-align:baseline;";
  el.appendChild(marker);
  const top = marker.getBoundingClientRect().top;
  el.removeChild(marker);
  return top;
}

export default function HomePage() {
  const router = useRouter();
  const introRef = useRef<HTMLDivElement>(null);
  const welcomeRef = useRef<HTMLHeadingElement>(null);
  const totheRef = useRef<HTMLHeadingElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const topLogoRef = useRef<HTMLImageElement>(null);
  const rotatingLineRef = useRef<HTMLDivElement>(null);

  const [introComplete, setIntroComplete] = useState(false);
  const [introScale, setIntroScale] = useState(1);

  useLayoutEffect(() => {
    const update = () =>
      setIntroScale(computeIntroScale(window.innerWidth, window.innerHeight));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (introComplete) {
      document.body.style.overflow = "";
      delete document.body.dataset.introActive;
      return;
    }
    document.body.style.overflow = "hidden";
    document.body.dataset.introActive = "true";
    return () => {
      document.body.style.overflow = "";
      delete document.body.dataset.introActive;
    };
  }, [introComplete]);

  useLayoutEffect(() => {
    if (introComplete) return;

    const intro = introRef.current;
    const welcome = welcomeRef.current;
    const tothe = totheRef.current;
    const logo = logoRef.current;
    const topLogo = topLogoRef.current;
    const rotatingLine = rotatingLineRef.current;
    if (!intro || !welcome || !tothe || !logo || !rotatingLine) return;

    document.body.style.overflow = "hidden";

    const centerStack = {
      left: "50%",
      top: "50%",
      xPercent: -50,
      yPercent: -50,
      y: 0,
    };

    gsap.set(welcome, centerStack);
    gsap.set(tothe, centerStack);
    gsap.set(logo, {
      ...centerStack,
      rotation: -25,
      scale: 1.4,
      transformOrigin: "center center",
      force3D: true,
    });
    gsap.set(rotatingLine, {
      rotation: 0,
      transformOrigin: "center center",
    });
    if (topLogo) {
      gsap.set(topLogo, { xPercent: -50, y: -140, opacity: 0 });
    }

    let cancelled = false;
    let tl: gsap.core.Timeline | null = null;

    /**
     * Üç eşit boşluk (üst → WELCOME, WELCOME → TO THE, TO THE → logo) verecek
     * final y offset'lerini gerçek görsel ölçümlerden hesapla. Kompozisyon üstten
     * sabitlenir; böylece boşluklar her ekran boyutunda eşit kalır.
     */
    const computeTargets = (bounds: LogoBounds | null) => {
      const scale = computeIntroScale(window.innerWidth, window.innerHeight);
      const fallback = {
        welcomeY: INTRO_FINAL_Y.welcome * scale,
        totheY: INTRO_FINAL_Y.tothe * scale,
        logoY: INTRO_FINAL_Y.logo * scale,
      };
      if (!bounds) return fallback;

      const fontPx = INTRO_FONT_PX * scale;
      const cs = window.getComputedStyle(welcome);
      const wM = measureTextVisual("WELCOME", cs.fontWeight, fontPx, cs.fontFamily);
      const tM = measureTextVisual("TO THE", cs.fontWeight, fontPx, cs.fontFamily);
      if (!wM || !tM) return fallback;

      const b0w = measureBaselineY(welcome);
      const b0t = measureBaselineY(tothe);
      if (!Number.isFinite(b0w) || !Number.isFinite(b0t)) return fallback;

      const centerY = window.innerHeight / 2;
      const gap = INTRO_GAP_RATIO * (wM.ascent + wM.descent);

      const welcomeVisualTop = gap;
      const welcomeY = welcomeVisualTop + wM.ascent - b0w;

      const totheVisualTop = welcomeVisualTop + wM.ascent + wM.descent + gap;
      const totheY = totheVisualTop + tM.ascent - b0t;

      const totheVisualBottom = totheVisualTop + tM.ascent + tM.descent;
      const logoVisibleTop = totheVisualBottom + gap;

      const displayW = INTRO_LOGO_W * scale;
      const displayH = displayW * bounds.aspect;
      const logoVisibleTopAt0 =
        centerY - displayH / 2 + bounds.topRatio * displayH;
      const logoY = logoVisibleTop - logoVisibleTopAt0;

      return { welcomeY, totheY, logoY };
    };

    const build = async () => {
      try {
        await document.fonts?.ready;
      } catch {
        /* font API yoksa devam */
      }
      const bounds = await getLogoVisibleBounds();
      if (cancelled) return;

      const { welcomeY, totheY, logoY } = computeTargets(bounds);

      tl = gsap.timeline({ delay: 1.2 });

      tl.to(welcome, { y: welcomeY, duration: 2, ease: "power3.inOut" })
        .to(tothe, { y: totheY, duration: 2, ease: "power3.inOut" }, "<")
        .to(
          logo,
          { y: logoY, rotation: 0, scale: 1, duration: 2, ease: "power3.inOut" },
          "<",
        )
        .to(
          rotatingLine,
          { rotation: 90, duration: 2, ease: "power3.inOut" },
          "<",
        )
        .to({}, { duration: 1.5 })
        .to(intro, {
          y: "100vh",
          duration: 0.9,
          ease: "power2.inOut",
          onComplete: () => {
            document.body.style.overflow = "";
            setIntroComplete(true);
          },
        });

      // Ana logo yukarıdan iner — intro paneli aşağı kayarken belirir
      if (topLogo) {
        tl.to(
          topLogo,
          { y: 0, opacity: 1, duration: 0.9, ease: "power3.out" },
          "<",
        );
      }
    };

    build();

    return () => {
      cancelled = true;
      tl?.kill();
      document.body.style.overflow = "";
    };
  }, [introComplete, introScale]);

  // Header'ı gizle
  useEffect(() => {
    const header = document.querySelector("header");
    if (header instanceof HTMLElement) {
      header.style.display = "none";
    }
    return () => {
      if (header instanceof HTMLElement) {
        header.style.display = "";
      }
    };
  }, []);

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {!introComplete && (
        <div
          ref={introRef}
          id="intro-section"
          className="fixed inset-0 z-50 overflow-hidden bg-black will-change-transform"
          aria-hidden={introComplete}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- GSAP animates this logo directly */}
            <img
              ref={logoRef}
              id="intro-logo"
              src="/layers/goodeyelogo.gif"
              alt="Good Eye Club"
              className="pointer-events-none absolute left-1/2 top-1/2 z-10 select-none will-change-transform"
              style={{
                width: `${INTRO_LOGO_W * introScale}px`,
                height: "auto",
                transform: "translate(-50%, -50%) rotate(-25deg) scale(1.4)",
              }}
            />

            {/* Yazı grubu tek katman olarak GIF ile difference alır;
                grup içinde WELCOME/TO THE birbiriyle etkileşmez */}
            <div
              className="absolute inset-0 z-20"
              style={{ mixBlendMode: "difference", isolation: "isolate" }}
            >
              <h1
                ref={welcomeRef}
                id="welcome-text"
                className="font-planc absolute left-1/2 top-1/2 select-none whitespace-nowrap text-center font-bold text-[#FFFFFF] will-change-transform"
                style={{
                  fontSize: `${INTRO_FONT_PX * introScale}px`,
                  lineHeight: 0.93,
                  letterSpacing: "0em",
                }}
              >
                WELCOME
              </h1>

              <h2
                ref={totheRef}
                id="tothe-text"
                className="font-planc absolute left-1/2 top-1/2 select-none whitespace-nowrap text-center font-bold text-[#FFFFFF] will-change-transform"
                style={{
                  fontSize: `${INTRO_FONT_PX * introScale}px`,
                  lineHeight: 0.93,
                  letterSpacing: "0em",
                }}
              >
                TO THE
              </h2>
            </div>
          </div>

          <div
            className="absolute bottom-[50px] left-1/2"
            style={{ transform: "translateX(-50%)" }}
          >
            <div
              className="relative flex items-center justify-center"
              style={{ width: "40px", height: "40px" }}
            >
              <div
                id="vertical-line"
                className="absolute bg-white"
                style={{ width: "1px", height: "40px" }}
              />
              <div
                ref={rotatingLineRef}
                id="rotating-line"
                className="absolute bg-white"
                style={{
                  width: "1px",
                  height: "40px",
                  transform: "rotate(0deg)",
                }}
              />
            </div>
          </div>
        </div>
      )}

      <section className="relative z-1 h-screen w-full overflow-hidden bg-[#E8E8E8] px-6 py-24 md:px-10">
        {/* eslint-disable-next-line @next/next/no-img-element -- GSAP animates this logo directly */}
        <img
          ref={topLogoRef}
          src="/layers/goodeyelogo.gif"
          alt="Good Eye Club"
          className="pointer-events-none fixed left-1/2 top-5 z-40 select-none will-change-transform"
          style={{
            width: "clamp(86px, 10.5vw, 144px)",
            height: "auto",
            transform: "translateX(-50%)",
          }}
        />

        <FloatingLogos active={introComplete} />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-12rem)] max-w-[500px] flex-col items-center justify-center gap-10 pt-16 text-center">
          <p className="text-sm leading-relaxed text-[#1A1A1A] md:text-base md:leading-[1.6]">
            Gorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam eu
            turpis molestie, dictum est a, mattis tellus. Sed dignissim, metus
            nec fringilla accumsan, risus sem sollicitudin lacus, ut interdum t
            Aliquam in elementum tellus. Etiam eu turpis
          </p>

          <PressButton
            label="CHALLENGE ACCEPTED!"
            onClick={() => router.push("/onboarding")}
            width={260}
            height={44}
          />
        </div>

        <div className="fixed bottom-6 right-6 z-60 flex flex-col items-end gap-0.5">
          <span className="text-[9px] text-[#999]">created by</span>
          <Link
            href="https://studyo.co"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="+Stüdyo"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="+Stüdyo" width={53} height={13} />
          </Link>
        </div>
      </section>
    </div>
  );
}
