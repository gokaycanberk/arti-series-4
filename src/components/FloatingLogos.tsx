"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

import { HOME_GAME_LOGOS } from "@/lib/homeGameLogos";

interface FloatingLogosProps {
  /** Intro bittikten sonra fizik döngüsünü başlat */
  active: boolean;
}

/** Her logonun fizik durumu (offset px + hız) */
interface LogoState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  ampX: number;
  ampY: number;
  ampRot: number;
  freqX: number;
  freqY: number;
  freqRot: number;
  phaseX: number;
  phaseY: number;
  phaseRot: number;
  grabX: number;
  grabY: number;
  grabClientX: number;
  grabClientY: number;
  lastClientX: number;
  lastClientY: number;
  lastMoveT: number;
}

// ── Fizik sabitleri ──
const SPRING = 4.2; // yuvaya dönüş yayı (düşük = daha tembel/uzay hissi)
const DAMPING = 2.3; // sönümleme
const ROT_SPRING = 3.6;
const ROT_DAMPING = 2.2;
const MAX_OFFSET = 280; // yuvadan en fazla uzaklık (px)
const MAX_VELOCITY = 2600; // px/s
const THROW_TO_SPIN = 0.02; // yatay fırlatma hızının açısal hıza katkısı
const RAMP_SECONDS = 2; // süzülmenin sıfırdan yumuşak açılışı

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Determinist başlangıç — hydration uyumsuzluğunu önlemek için index tabanlı */
function makeState(index: number): LogoState {
  const seed = index + 1;
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    rot: 0,
    vrot: 0,
    ampX: 18 + (seed % 3) * 7,
    ampY: 22 + (seed % 4) * 6,
    ampRot: 1.6 + (seed % 3) * 0.7,
    freqX: 0.22 + (seed % 5) * 0.03,
    freqY: 0.18 + (seed % 4) * 0.035,
    freqRot: 0.16 + (seed % 3) * 0.04,
    phaseX: seed * 1.7,
    phaseY: seed * 2.3,
    phaseRot: seed * 0.9,
    grabX: 0,
    grabY: 0,
    grabClientX: 0,
    grabClientY: 0,
    lastClientX: 0,
    lastClientY: 0,
    lastMoveT: 0,
  };
}

export default function FloatingLogos({ active }: FloatingLogosProps) {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const statesRef = useRef<LogoState[]>(HOME_GAME_LOGOS.map((_, i) => makeState(i)));
  const draggingRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;

    const states = statesRef.current;
    let last = performance.now();
    let elapsed = 0;

    const apply = (i: number) => {
      const el = itemRefs.current[i];
      const s = states[i];
      const layer = HOME_GAME_LOGOS[i];
      if (!el || !s || !layer) return;
      el.style.transform = `translate3d(${s.x.toFixed(2)}px, ${s.y.toFixed(
        2,
      )}px, 0) rotate(${(layer.rotate + s.rot).toFixed(3)}deg)`;
    };

    const tick = (now: number) => {
      const dt = clamp((now - last) / 1000, 0, 0.05);
      last = now;
      elapsed += dt;
      const ramp = clamp(elapsed / RAMP_SECONDS, 0, 1);

      for (let i = 0; i < states.length; i++) {
        const s = states[i]!;

        if (draggingRef.current !== i) {
          // Süzülme hedefi (yavaş sinüs) — yaya bu hedefi takip ettiririz
          const tx = ramp * s.ampX * Math.sin(s.freqX * elapsed + s.phaseX);
          const ty = ramp * s.ampY * Math.sin(s.freqY * elapsed + s.phaseY);
          const tr = ramp * s.ampRot * Math.sin(s.freqRot * elapsed + s.phaseRot);

          s.vx += (SPRING * (tx - s.x) - DAMPING * s.vx) * dt;
          s.vy += (SPRING * (ty - s.y) - DAMPING * s.vy) * dt;
          s.vx = clamp(s.vx, -MAX_VELOCITY, MAX_VELOCITY);
          s.vy = clamp(s.vy, -MAX_VELOCITY, MAX_VELOCITY);
          s.x += s.vx * dt;
          s.y += s.vy * dt;

          // Yumuşak sınır — çok uzağa kaçmasın, tasarım dağılmasın
          const dist = Math.hypot(s.x, s.y);
          if (dist > MAX_OFFSET) {
            const k = MAX_OFFSET / dist;
            s.x *= k;
            s.y *= k;
            s.vx *= 0.5;
            s.vy *= 0.5;
          }

          s.vrot += (ROT_SPRING * (tr - s.rot) - ROT_DAMPING * s.vrot) * dt;
          s.rot += s.vrot * dt;
        }

        apply(i);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  const onPointerDown = (i: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    const s = statesRef.current[i];
    if (!s) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = i;
    s.grabX = s.x;
    s.grabY = s.y;
    s.grabClientX = e.clientX;
    s.grabClientY = e.clientY;
    s.lastClientX = e.clientX;
    s.lastClientY = e.clientY;
    s.lastMoveT = performance.now();
    s.vx = 0;
    s.vy = 0;
    e.currentTarget.style.cursor = "grabbing";
  };

  const onPointerMove = (i: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current !== i) return;
    const s = statesRef.current[i];
    if (!s) return;

    s.x = s.grabX + (e.clientX - s.grabClientX);
    s.y = s.grabY + (e.clientY - s.grabClientY);

    const now = performance.now();
    const dt = (now - s.lastMoveT) / 1000;
    if (dt > 0) {
      s.vx = clamp((e.clientX - s.lastClientX) / dt, -MAX_VELOCITY, MAX_VELOCITY);
      s.vy = clamp((e.clientY - s.lastClientY) / dt, -MAX_VELOCITY, MAX_VELOCITY);
    }
    s.lastClientX = e.clientX;
    s.lastClientY = e.clientY;
    s.lastMoveT = now;
  };

  const endDrag = (i: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current !== i) return;
    const s = statesRef.current[i];
    draggingRef.current = null;
    e.currentTarget.style.cursor = "grab";
    if (!s) return;
    // Fırlatma → hafif dönüş momentumu
    s.vrot += clamp(s.vx * THROW_TO_SPIN, -220, 220);
  };

  return (
    <div className="pointer-events-none absolute inset-0 min-h-screen">
      {HOME_GAME_LOGOS.map((layer, index) => (
        <div
          key={layer.id}
          ref={(el) => {
            itemRefs.current[index] = el;
          }}
          className="pointer-events-auto absolute z-0 will-change-transform"
          style={{
            left: layer.left,
            top: layer.top,
            width: layer.width,
            transformOrigin: "center center",
            transform: `rotate(${layer.rotate}deg)`,
            touchAction: "none",
            cursor: "grab",
          }}
          onPointerDown={onPointerDown(index)}
          onPointerMove={onPointerMove(index)}
          onPointerUp={endDrag(index)}
          onPointerCancel={endDrag(index)}
        >
          <Image
            src={layer.src}
            alt={layer.alt}
            width={828}
            height={400}
            className="pointer-events-none h-auto w-full select-none"
            draggable={false}
            priority={active}
          />
        </div>
      ))}
    </div>
  );
}
