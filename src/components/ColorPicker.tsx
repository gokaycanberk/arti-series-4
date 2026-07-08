"use client";

import gsap from "gsap";
import { useCallback, useEffect, useState } from "react";

import PressButton from "@/components/PressButton";
import { useGameStore } from "@/stores/gameStore";

const AVATAR_SOURCES = [
  "/Avatar_Set/ear/1.png",
  "/Avatar_Set/ear/2.png",
  "/Avatar_Set/ear/3.png",
  "/Avatar_Set/ear/4.png",
  "/Avatar_Set/ear/5.png",
  "/Avatar_Set/ear/6.png",
  "/Avatar_Set/ear/7.png",
  "/Avatar_Set/eye/1.png",
  "/Avatar_Set/eye/2.png",
  "/Avatar_Set/eye/3.png",
  "/Avatar_Set/eye/4.png",
  "/Avatar_Set/eye/5.png",
  "/Avatar_Set/eye/6.png",
  "/Avatar_Set/eye/7.png",
  "/Avatar_Set/eye/8.png",
  "/Avatar_Set/eye/9.png",
  "/Avatar_Set/hair/1.png",
  "/Avatar_Set/hair/2.png",
  "/Avatar_Set/hair/3.png",
  "/Avatar_Set/hair/4.png",
  "/Avatar_Set/hair/5.png",
  "/Avatar_Set/hair/6.png",
  "/Avatar_Set/hair/7.png",
  "/Avatar_Set/hair/8.png",
  "/Avatar_Set/hair/9.png",
  "/Avatar_Set/hair/10.png",
  "/Avatar_Set/lips/1.png",
  "/Avatar_Set/lips/2.png",
  "/Avatar_Set/lips/3.png",
  "/Avatar_Set/lips/4.png",
  "/Avatar_Set/lips/5.png",
  "/Avatar_Set/lips/6.png",
  "/Avatar_Set/lips/7.png",
  "/Avatar_Set/lips/8.png",
  "/Avatar_Set/nose/1.png",
  "/Avatar_Set/nose/2.png",
  "/Avatar_Set/nose/3.png",
  "/Avatar_Set/nose/4.png",
  "/Avatar_Set/nose/5.png",
  "/Avatar_Set/nose/6.png",
  "/Avatar_Set/nose/7.png",
  "/Avatar_Set/nose/8.png",
  "/Avatar_Set/nose/9.png",
];

const AVATAR_SOURCES_DOUBLED = [...AVATAR_SOURCES, ...AVATAR_SOURCES];

const WHEEL_SIZE = 280;
const WHEEL_RADIUS = WHEEL_SIZE / 2;
const PICKER_STROKE = "1.5px solid #1A1A1A";

interface FloatingItem {
  src: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
}

interface SelectedColor {
  hex: string;
  h: number;
  s: number;
}

interface ColorPickerProps {
  onTransitionStart: () => void;
  onTransitionComplete: () => void;
  isTransitioning: boolean;
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

function getContrastColor(hex: string): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#1A1A1A" : "#FFFFFF";
}

function generateFloatingItems(): FloatingItem[] {
  const isMobile = window.innerWidth < 768;
  const items: FloatingItem[] = [];

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = vw / 2;
  const cy = vh / 2;

  const minRadius = 220;
  const maxRadius = Math.sqrt(cx * cx + cy * cy) * 0.95;
  const goldenAngle = 137.508 * (Math.PI / 180);

  const sources = [...AVATAR_SOURCES_DOUBLED];
  const totalCount = isMobile ? 44 : 86;

  while (sources.length < totalCount) {
    sources.push(
      AVATAR_SOURCES[Math.floor(Math.random() * AVATAR_SOURCES.length)]!,
    );
  }

  for (let i = sources.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sources[i], sources[j]] = [sources[j]!, sources[i]!];
  }

  for (let i = 0; i < totalCount; i++) {
    const t = i / (totalCount - 1);
    const r = minRadius + (maxRadius - minRadius) * Math.sqrt(t);
    const theta = i * goldenAngle;

    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);

    const jitterX = (Math.random() - 0.5) * 40;
    const jitterY = (Math.random() - 0.5) * 40;

    const finalX = x + jitterX;
    const finalY = y + jitterY;

    const xPercent = (finalX / vw) * 100;
    const yPercent = (finalY / vh) * 100;

    if (xPercent < -10 || xPercent > 110 || yPercent < -10 || yPercent > 110)
      continue;

    items.push({
      src: sources[i]!,
      x: xPercent,
      y: yPercent,
      size: Math.floor(Math.random() * 40) + 35,
      rotation: Math.floor(Math.random() * 50) - 25,
    });
  }

  return items;
}

function drawColorWheel(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = canvas.width / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let angle = 0; angle < 360; angle++) {
    const startAngle = ((angle - 1) * Math.PI) / 180;
    const endAngle = ((angle + 1) * Math.PI) / 180;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, `hsl(${angle}, 10%, 100%)`);
    gradient.addColorStop(0.5, `hsl(${angle}, 70%, 70%)`);
    gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }
}

export default function ColorPicker({
  onTransitionStart,
  onTransitionComplete,
}: ColorPickerProps) {
  const [mounted, setMounted] = useState(false);
  const [floatingItems, setFloatingItems] = useState<FloatingItem[]>([]);
  const [selectedColor, setSelectedColor] = useState<SelectedColor | null>(
    null,
  );
  const [indicatorPos, setIndicatorPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // --- MOUNT ---
  useEffect(() => {
    const header = document.querySelector("header");
    if (header instanceof HTMLElement) {
      header.style.display = "none";
    }

    const h = Math.floor(Math.random() * 360);
    const s = 50 + Math.floor(Math.random() * 50);
    const hex = hslToHex(h, s, 50);
    const angle = (h * Math.PI) / 180;
    const dist = (s / 100) * WHEEL_RADIUS;

    queueMicrotask(() => {
      setSelectedColor({ hex, h, s });
      setIndicatorPos({
        x: WHEEL_RADIUS + Math.cos(angle) * dist,
        y: WHEEL_RADIUS + Math.sin(angle) * dist,
      });
      setFloatingItems(generateFloatingItems());
      setMounted(true);
    });

    return () => {
      if (header instanceof HTMLElement) {
        header.style.display = "";
      }
    };
  }, []);

  // --- CANVAS ---
  useEffect(() => {
    if (!mounted) return;

    const canvas = document.getElementById(
      "color-wheel",
    ) as HTMLCanvasElement | null;
    if (!canvas) return;

    canvas.width = WHEEL_SIZE;
    canvas.height = WHEEL_SIZE;
    drawColorWheel(canvas);
  }, [mounted]);

  // --- GSAP: floating items giriş animasyonu ---
  useEffect(() => {
    if (!mounted || floatingItems.length === 0) return;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    floatingItems.forEach((item, i) => {
      const el = document.getElementById(`float-${i}`);
      if (!el) return;

      const finalX = (item.x / 100) * window.innerWidth;
      const finalY = (item.y / 100) * window.innerHeight;

      gsap.fromTo(
        el,
        {
          left: centerX,
          top: centerY,
          scale: 0,
          rotation: gsap.utils.random(-720, 720),
          opacity: 0,
        },
        {
          left: finalX,
          top: finalY,
          scale: 1,
          rotation: item.rotation,
          opacity: 0.9,
          duration: gsap.utils.random(1.5, 3),
          delay: gsap.utils.random(0, 1.2),
          ease: "power3.out",
          onComplete: () => {
            gsap.to(el, {
              x: gsap.utils.random(-20, 20),
              y: gsap.utils.random(-12, 12),
              rotation: `+=${gsap.utils.random(-8, 8)}`,
              duration: gsap.utils.random(7, 14),
              repeat: -1,
              yoyo: true,
              ease: "sine.inOut",
            });
          },
        },
      );
    });

    return () => {
      gsap.killTweensOf('[id^="float-"]');
    };
  }, [mounted, floatingItems]);

  // --- COLOR WHEEL: etkileşim ---
  const handleWheelInteraction = useCallback(
    (
      event:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>,
    ) => {
      if (isAnimating) return;

      const canvas = event.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const clientX =
        "touches" in event ? event.touches[0].clientX : event.clientX;
      const clientY =
        "touches" in event ? event.touches[0].clientY : event.clientY;
      const x = clientX - rect.left - rect.width / 2;
      const y = clientY - rect.top - rect.height / 2;
      const dist = Math.sqrt(x * x + y * y);
      const maxDist = rect.width / 2;

      if (dist > maxDist) return;

      const angle = (Math.atan2(y, x) * 180) / Math.PI + 360;
      const sat = Math.round((dist / maxDist) * 100);
      const hue = Math.round(angle % 360);
      const hex = hslToHex(hue, sat, 50);

      setSelectedColor({ hex, h: hue, s: sat });
      setIndicatorPos({
        x: clientX - rect.left,
        y: clientY - rect.top,
      });
    },
    [isAnimating],
  );

  // --- HANDLE START: Girdap + Flash + Face Reveal ---
  const handleStart = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    onTransitionStart();

    if (selectedColor) {
      useGameStore.getState().setNickname(selectedColor.hex);
    }

    gsap.killTweensOf('[id^="float-"]');

    const tl = gsap.timeline();

    // === FAZ 1: UI elemanları küçülüp kaybolur ===
    tl.to(
      "#pick-name-box, #color-wheel-container, #bottom-row",
      {
        scale: 0,
        opacity: 0,
        duration: 0.6,
        ease: "power2.in",
        stagger: 0.05,
      },
      0,
    );

    // === FAZ 2: Çemberler küçülür ===
    tl.to(
      ".concentric-circle",
      {
        scale: 0,
        opacity: 0,
        duration: 0.7,
        ease: "power2.in",
        stagger: 0.1,
      },
      0.2,
    );

    // === FAZ 3: Avatar parçaları ===
    const allAvatars = document.querySelectorAll('[id^="float-"]');
    const avatarArray = Array.from(allAvatars);
    const shuffled = [...avatarArray].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, 6);
    const rejected = shuffled.slice(6);

    // Reddedilenler — ekran dışına
    rejected.forEach((el) => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 1500;
      tl.to(
        el,
        {
          x: `+=${Math.cos(angle) * distance}`,
          y: `+=${Math.sin(angle) * distance}`,
          opacity: 0,
          rotation: `+=${(Math.random() - 0.5) * 720}`,
          duration: 0.8 + Math.random() * 0.4,
          ease: "power3.in",
        },
        0.4 + Math.random() * 0.3,
      );
    });

    // Seçilenler — merkeze girdap
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    chosen.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      const elCx = rect.left + rect.width / 2;
      const elCy = rect.top + rect.height / 2;
      const dx = cx - elCx;
      const dy = cy - elCy;
      const delay = 0.5 + i * 0.15;

      tl.to(
        el,
        {
          x: `+=${dx}`,
          y: `+=${dy}`,
          rotation: `+=${720 + Math.random() * 360}`,
          scale: 0.6,
          duration: 1.6,
          ease: "power2.in",
        },
        delay,
      );

      tl.to(
        el,
        {
          scale: 0,
          opacity: 0,
          rotation: `+=360`,
          duration: 0.5,
          ease: "power4.in",
        },
        delay + 1.4,
      );
    });

    // === FAZ 4: Beyaz flash (parent'taki #flash-overlay'i hedefler) ===
    tl.to(
      "#flash-overlay",
      {
        opacity: 1,
        duration: 0.25,
        ease: "power2.in",
      },
      2.4,
    );
    tl.to(
      "#flash-overlay",
      {
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
      },
      2.65,
    );

    // === FAZ 5: Face reveal (parent'taki #face-reveal'i hedefler) ===
    tl.to(
      "#face-reveal",
      {
        scale: 1,
        opacity: 1,
        duration: 0.8,
        ease: "back.out(1.7)",
      },
      2.5,
    );

    // Face pulse
    tl.to(
      "#face-reveal",
      {
        scale: 1.12,
        duration: 0.35,
        ease: "power1.inOut",
        yoyo: true,
        repeat: 2,
      },
      3.3,
    );

    // Face sağa kayarak ekrandan çıkar
    tl.set(
      "#face-reveal",
      {
        xPercent: -50,
        yPercent: -50,
        left: "50%",
        top: "50%",
        x: 0,
        y: 0,
      },
      4.15,
    );
    tl.to(
      "#face-reveal",
      {
        x: () => window.innerWidth * 0.52 + 80,
        scale: 0.55,
        duration: 0.85,
        ease: "power3.in",
      },
      4.2,
    );

    // Geçişi tamamla — ColorPicker unmount, GameShell mount
    tl.call(
      () => {
        onTransitionComplete();
      },
      [],
      5.1,
    );
  }, [selectedColor, isAnimating, onTransitionStart, onTransitionComplete]);

  return (
    <>
      {/* Concentric Circles */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="absolute rounded-full concentric-circle"
          style={{
            width: "960px",
            height: "960px",
            border: "1.5px solid #1A1A1A",
          }}
        />
        <div
          className="absolute rounded-full concentric-circle"
          style={{
            width: "1568px",
            height: "1568px",
            border: "1.5px solid #1A1A1A",
          }}
        />
        <div
          className="absolute rounded-full concentric-circle"
          style={{
            width: "1968px",
            height: "1968px",
            border: "1px solid #C0C0C0",
          }}
        />
      </div>

      {/* Floating Avatar Items */}
      {mounted &&
        floatingItems.map((item, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            id={`float-${i}`}
            src={item.src}
            alt=""
            className="pointer-events-none absolute z-[1] select-none"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              width: `${item.size}px`,
              height: "auto",
              filter: "grayscale(1)",
              opacity: 0,
              transform: "scale(0)",
            }}
          />
        ))}

      {/* Center Content */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
        {/* Pick your name box */}
        <div
          id="pick-name-box"
          className="flex items-center justify-center font-planc text-[20px] text-[#1A1A1A]"
          style={{
            width: "360px",
            height: "60px",
            backgroundColor: "#E8E8E8",
            fontWeight: 450,
            marginTop: "24px",
            marginBottom: "20px",
            border: PICKER_STROKE,
          }}
        >
          Pick your name below ↓
        </div>

        {/* Wheel frame + Canvas */}
        <div
          id="color-wheel-container"
          className="relative flex items-center justify-center rounded-full"
          style={{
            width: `${280 + 66 * 2}px`,
            height: `${280 + 66 * 2}px`,
            border: PICKER_STROKE,
          }}
        >
          <div className="relative">
            <canvas
              id="color-wheel"
              width={280}
              height={280}
              className="cursor-crosshair rounded-full"
              onMouseDown={(event) => {
                setIsDragging(true);
                handleWheelInteraction(event);
              }}
              onMouseMove={(event) => {
                if (isDragging) handleWheelInteraction(event);
              }}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              onTouchStart={handleWheelInteraction}
              onTouchMove={handleWheelInteraction}
            />

            {indicatorPos && (
              <div
                className="pointer-events-none absolute h-3 w-3 rounded-full border-2 border-white"
                style={{
                  left: indicatorPos.x - 6,
                  top: indicatorPos.y - 6,
                  boxShadow: "0 0 4px rgba(0,0,0,0.4)",
                }}
              />
            )}
          </div>
        </div>

        {/* Bottom row: AKA + LET'S GO */}
        <div
          id="bottom-row"
          className="flex items-stretch gap-3"
          style={{ marginTop: "20px", height: "89px" }}
        >
          <div
            className="flex flex-col"
            style={{ width: "196px", height: "89px", border: PICKER_STROKE }}
          >
            <div
              className="flex flex-1 items-center justify-center bg-[#E8E8E8] font-planc text-[20px] text-[#1A1A1A]"
              style={{ fontWeight: 450, borderBottom: PICKER_STROKE }}
            >
              A.K.A:
            </div>
            <div
              className="flex flex-1 items-center justify-center font-planc text-[20px] leading-none"
              style={{
                backgroundColor: selectedColor?.hex || "#cccccc",
                color: getContrastColor(selectedColor?.hex || "#cccccc"),
                fontWeight: 450,
              }}
            >
              <span style={{ fontWeight: 700 }}>HEX</span>
              <span style={{ fontWeight: 450 }}>
                {selectedColor?.hex?.toUpperCase() || "#000000"}
              </span>
            </div>
          </div>

          <PressButton
            label="LET'S GO!"
            onClick={handleStart}
            width={146}
            height={77}
          />
        </div>
      </div>
    </>
  );
}
