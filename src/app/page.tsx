"use client";

import gsap from "gsap";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import PressButton from "@/components/PressButton";

const PARALLAX_LAYERS = [
  {
    src: "/layers/Layer1.png",
    depth: 15,
    className: "left-[-5%] top-[30%] w-[26vw] md:w-[20vw]",
  },
  {
    src: "/layers/Layer2.png",
    depth: 10,
    className: "left-[45%] top-[-3%] w-[14vw] md:w-[10vw]",
  },
  {
    src: "/layers/Layer3.png",
    depth: 20,
    className: "right-[-3%] top-[5%] w-[28vw] md:w-[22vw]",
  },
  {
    src: "/layers/Layer4.png",
    depth: 12,
    className: "left-[10%] bottom-[5%] w-[24vw] md:w-[18vw]",
  },
  {
    src: "/layers/Layer3.png",
    depth: 18,
    className: "right-[5%] bottom-[8%] w-[28vw] md:w-[22vw]",
  },
] as const;

export default function HomePage() {
  const router = useRouter();
  const introRef = useRef<HTMLDivElement>(null);
  const welcomeRef = useRef<HTMLHeadingElement>(null);
  const totheRef = useRef<HTMLHeadingElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const rotatingLineRef = useRef<HTMLDivElement>(null);

  const [introComplete, setIntroComplete] = useState(false);
  const [parallaxEnabled, setParallaxEnabled] = useState(false);
  const [layerOffsets, setLayerOffsets] = useState(
    PARALLAX_LAYERS.map(() => ({ x: 0, y: 0 })),
  );

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px) and (hover: hover)");
    const update = () => setParallaxEnabled(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
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

    const tl = gsap.timeline({ delay: 1.2 });

    tl.to(welcome, {
      y: -120,
      duration: 2,
      ease: "power3.inOut",
    })
      .to(
        tothe,
        {
          y: 100,
          duration: 2,
          ease: "power3.inOut",
        },
        "<",
      )
      .to(
        logo,
        {
          y: 220,
          rotation: 0,
          scale: 1,
          duration: 2,
          ease: "power3.inOut",
        },
        "<",
      )
      .to(
        rotatingLine,
        {
          rotation: 90,
          duration: 2,
          ease: "power3.inOut",
        },
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

    return () => {
      tl.kill();
      document.body.style.overflow = "";
    };
  }, [introComplete]);

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!parallaxEnabled) return;

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const deltaX = (event.clientX - centerX) / centerX;
      const deltaY = (event.clientY - centerY) / centerY;

      setLayerOffsets(
        PARALLAX_LAYERS.map((layer) => ({
          x: deltaX * layer.depth,
          y: deltaY * layer.depth,
        })),
      );
    },
    [parallaxEnabled],
  );

  useEffect(() => {
    if (!parallaxEnabled || introComplete === false) return;

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove, introComplete, parallaxEnabled]);

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
    <div className="relative w-full overflow-x-clip">
      {!introComplete && (
        <div
          ref={introRef}
          id="intro-section"
          className="fixed inset-0 z-50 overflow-hidden bg-black will-change-transform"
          aria-hidden={introComplete}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <h1
              ref={welcomeRef}
              id="welcome-text"
              className="font-planc absolute left-1/2 top-1/2 select-none whitespace-nowrap text-center font-bold text-[#FFFFFF] will-change-transform"
              style={{
                fontSize: "clamp(80px, 18vw, 270px)",
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
                fontSize: "clamp(80px, 18vw, 270px)",
                lineHeight: 0.93,
                letterSpacing: "0em",
              }}
            >
              TO THE
            </h2>

            {/* eslint-disable-next-line @next/next/no-img-element -- GSAP animates this logo directly */}
            <img
              ref={logoRef}
              id="intro-logo"
              src="/mainpagelogo.png"
              alt="Logo"
              className="pointer-events-none absolute left-1/2 top-1/2 z-10 select-none will-change-transform"
              style={{
                width: "clamp(150px, 25vw, 380px)",
                transform: "translate(-50%, -50%) rotate(-25deg) scale(1.4)",
              }}
            />
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

      <section className="relative z-1 min-h-screen w-full overflow-x-clip bg-[#E8E8E8] px-6 py-24 md:px-10">
        {PARALLAX_LAYERS.map((layer, index) => (
          <div
            key={`${layer.src}-${index}`}
            className={`pointer-events-none absolute ${layer.className}`}
            style={{
              transform: `translate3d(${layerOffsets[index]?.x ?? 0}px, ${layerOffsets[index]?.y ?? 0}px, 0)`,
              transition: parallaxEnabled
                ? "transform 0.3s ease-out"
                : undefined,
            }}
          >
            <Image
              src={layer.src}
              alt=""
              width={480}
              height={480}
              className="h-auto w-full select-none"
              draggable={false}
              priority={introComplete}
            />
          </div>
        ))}

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
