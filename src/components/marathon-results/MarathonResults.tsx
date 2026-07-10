"use client";

import gsap from "gsap";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import PressButton from "@/components/PressButton";
import {
  CARD_DROP,
  CARD_OFFSET_X,
  CARD_OFFSET_Y,
  getDesignScale,
  getPlayerCardTop,
  INTRO_BADGE_START,
  INTRO_BLUR_DURATION,
  INTRO_CARD_IN_DURATION,
  INTRO_CARD_IN_START,
  INTRO_HUD_EXIT_DURATION,
  INTRO_HUD_EXIT_START,
  INTRO_Y,
  PLAYER_CARD_H,
  PLAYER_CARD_W,
  RESULTS_STACK_LIFT,
  RING_DISPLAY_PX,
  SCOREBOARD_CARD_GAP,
  BUTTONS_BOTTOM,
} from "@/components/marathon-results/constants";
import {
  elevateHudPanel,
  hideHudPanelElements,
  restoreHudPanelElements,
} from "@/components/marathon-results/hudPanelIntro";
import { PlayerScoreCard } from "@/components/marathon-results/PlayerScoreCard";
import { ScoreboardTable } from "@/components/marathon-results/ScoreboardTable";
import { getScoreRingImage } from "@/lib/scoreRing";
import { buildLeaderboard } from "@/lib/mockLeaderboard";
import { useGameStore } from "@/stores/gameStore";

interface MarathonResultsProps {
  score: number;
  onPlayAgain: () => void;
  instant?: boolean;
  freezeScene?: number | null;
}

export function MarathonResults({
  score,
  onPlayAgain,
  instant = false,
  freezeScene = null,
}: MarathonResultsProps) {
  const router = useRouter();
  const nickname = useGameStore((s) => s.nickname);
  const playerHex = nickname ?? "#F7BEA0";

  const ringSrc = useMemo(() => getScoreRingImage(score), [score]);
  const leaderboard = useMemo(() => buildLeaderboard(), []);

  const [designScale, setDesignScale] = useState(1);

  /* ── Refs ── */
  const blurRef = useRef<HTMLDivElement>(null);
  const scaleWrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const boardClipRef = useRef<HTMLDivElement>(null);
  const boardInnerRef = useRef<HTMLDivElement>(null);
  const badgeWrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const cardRootRef = useRef<HTMLDivElement>(null);
  const avatarCellRef = useRef<HTMLDivElement>(null);
  const hexCellRef = useRef<HTMLDivElement>(null);
  const labelCellRef = useRef<HTMLDivElement>(null);
  const scoreCellRef = useRef<HTMLDivElement>(null);
  const homeBtnRef = useRef<HTMLDivElement>(null);
  const againBtnRef = useRef<HTMLDivElement>(null);
  const ringSpinRef = useRef<gsap.core.Tween | null>(null);

  /* ── Responsive scale ── */
  useLayoutEffect(() => {
    const updateScale = () => {
      setDesignScale(getDesignScale(window.innerWidth, window.innerHeight));
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  /* ── Main animation timeline ── */
  useLayoutEffect(() => {
    const blur = blurRef.current;
    const scaleWrap = scaleWrapRef.current;
    const stage = stageRef.current;
    const boardClip = boardClipRef.current;
    const boardInner = boardInnerRef.current;
    const badge = badgeWrapRef.current;
    const card = cardRef.current;
    const cardRoot = cardRootRef.current;
    const avatarCell = avatarCellRef.current;
    const hexCell = hexCellRef.current;
    const labelCell = labelCellRef.current;
    const scoreCell = scoreCellRef.current;
    const homeBtn = homeBtnRef.current;
    const againBtn = againBtnRef.current;

    if (
      !blur ||
      !scaleWrap ||
      !stage ||
      !boardClip ||
      !boardInner ||
      !badge ||
      !card ||
      !cardRoot ||
      !avatarCell ||
      !hexCell ||
      !labelCell ||
      !scoreCell ||
      !homeBtn ||
      !againBtn
    )
      return;

    /** Halka görselini sürekli yavaş döndür — ease yok, duraksama yok. */
    const startRingSpin = (fromAngle = 0) => {
      ringSpinRef.current?.kill();
      gsap.set(badge, { rotation: fromAngle });
      ringSpinRef.current = gsap.to(badge, {
        rotation: fromAngle + 360,
        duration: 38,
        repeat: -1,
        ease: "none",
      });
    };

    const stopRingSpin = () => {
      ringSpinRef.current?.kill();
      ringSpinRef.current = null;
    };

    const boardFullH = boardInner.offsetHeight;
    const hudPanel = elevateHudPanel();
    const hudTargets = hudPanel ? [hudPanel.hex, hudPanel.score] : [];

    const syncHudElevated = () => {
      elevateHudPanel();
    };

    const setIntroHidden = () => {
      gsap.set(card, { scale: 0, opacity: 0, transformOrigin: "50% 50%" });
      gsap.set(cardRoot, { opacity: 1 });
      gsap.set(avatarCell, { opacity: 1 });
      gsap.set(hexCell, { opacity: 1 });
      gsap.set(labelCell, { opacity: 1 });
      gsap.set(scoreCell, { opacity: 1 });
    };

    const setCardAssembled = () => {
      gsap.set(card, { scale: 1, opacity: 1 });
      gsap.set(cardRoot, { opacity: 1 });
      gsap.set(avatarCell, { opacity: 1 });
      gsap.set(hexCell, { opacity: 1 });
      gsap.set(labelCell, { opacity: 1 });
      gsap.set(scoreCell, { opacity: 1 });
      hideHudPanelElements();
    };

    const computeFinalY = () => {
      const scale = designScale;
      const vh = window.innerHeight;
      const targetCardTop = getPlayerCardTop(vh, scale);
      const cardRect = card.getBoundingClientRect();
      const stageY = Number(gsap.getProperty(stage, "y")) || 0;
      const delta = targetCardTop - cardRect.top;

      return stageY + delta / scale;
    };

    /* ── Freeze scenes ── */
    const applyScene2570 = () => {
      gsap.set(blur, { opacity: 1 });
      gsap.set(stage, { y: INTRO_Y });
      gsap.set(boardClip, { height: 0 });
      gsap.set(badge, { opacity: 0, scale: 0 });
      setIntroHidden();
      syncHudElevated();
      gsap.set(homeBtn, { y: 52, opacity: 0 });
      gsap.set(againBtn, { y: 52, opacity: 0 });
    };

    const applyScene1679 = () => {
      gsap.set(blur, { opacity: 1 });
      gsap.set(stage, { y: INTRO_Y });
      gsap.set(boardClip, { height: 0 });
      hideHudPanelElements();
      setCardAssembled();
      gsap.set(badge, {
        scale: 0.38,
        opacity: 0.85,
        rotation: -73,
        transformOrigin: "50% 50%",
      });
      gsap.set(homeBtn, { y: 52, opacity: 0 });
      gsap.set(againBtn, { y: 52, opacity: 0 });
    };

    const applyScene2405 = () => {
      gsap.set(blur, { opacity: 1 });
      gsap.set(stage, { y: INTRO_Y });
      gsap.set(boardClip, { height: 0 });
      gsap.set(badge, { scale: 1, opacity: 1, rotation: 0 });
      setCardAssembled();
      hideHudPanelElements();
      gsap.set(homeBtn, { y: 52, opacity: 0 });
      gsap.set(againBtn, { y: 52, opacity: 0 });
      startRingSpin(0);
    };

    const applyScene2223 = () => {
      gsap.set(blur, { opacity: 1 });
      gsap.set(stage, { y: INTRO_Y });
      gsap.set(boardClip, { height: 0 });
      gsap.set(badge, { scale: 1, opacity: 1, rotation: 63.15 });
      setCardAssembled();
      hideHudPanelElements();
      gsap.set(homeBtn, { y: 52, opacity: 0 });
      gsap.set(againBtn, { y: 52, opacity: 0 });
      startRingSpin(63.15);
    };

    const applyFinal = (stageY: number) => {
      stopRingSpin();
      gsap.set(blur, { opacity: 1 });
      hideHudPanelElements();
      gsap.set(stage, { y: stageY });
      gsap.set(boardClip, { height: boardFullH, overflow: "visible" });
      gsap.set(badge, { opacity: 0, scale: 0 });
      setCardAssembled();
      gsap.set(homeBtn, { y: 0, opacity: 1 });
      gsap.set(againBtn, { y: 0, opacity: 1 });
      restoreHudPanelElements();
    };

    if (freezeScene === 2570) {
      applyScene2570();
      return;
    }
    if (freezeScene === 1679) {
      applyScene1679();
      return;
    }
    if (freezeScene === 2405) {
      applyScene2405();
      return;
    }
    if (freezeScene === 2223) {
      applyScene2223();
      return;
    }
    if (instant) {
      applyFinal(computeFinalY());
      return;
    }

    /* ── Full animation ── */
    gsap.set(blur, { opacity: 0 });
    gsap.set(stage, { y: INTRO_Y });
    gsap.set(boardClip, { height: 0 });
    setIntroHidden();
    syncHudElevated();
    gsap.set(badge, {
      scale: 0,
      opacity: 0,
      rotation: -73,
      transformOrigin: "50% 50%",
    });
    gsap.set(homeBtn, { y: 52, opacity: 0 });
    gsap.set(againBtn, { y: 52, opacity: 0 });

    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

    const badgeSpinStart = INTRO_BADGE_START;
    const badgeGrowDuration = 2.4;
    const badgeShrinkStart = badgeSpinStart + badgeGrowDuration + 3.5;
    const stageDropStart = badgeShrinkStart + 0.75;
    const stageDropDuration = 1.8;
    const boardRevealStart = stageDropStart + 1.1;
    const boardRevealDuration = 2.0;
    // Kart inişi bitsin — aynı anda iki stage.y tween titreme yapıyor
    const stageFinalStart = stageDropStart + stageDropDuration + 0.05;
    const stageFinalDuration = 1.6;
    const buttonsStart = stageFinalStart + stageFinalDuration + 0.35;
    let finalStageY = INTRO_Y + CARD_DROP;

    // 1) Blur — gerçek sağ panel (HEX + skor) net kalır
    tl.to(blur, { opacity: 1, duration: INTRO_BLUR_DURATION }, 0);
    tl.add(() => syncHudElevated(), 0);

    // 2) Sağ panel yavaş bounce ile kaybolur
    if (hudTargets.length > 0) {
      tl.to(
        hudTargets,
        {
          scale: 0.5,
          opacity: 0,
          y: -20,
          duration: INTRO_HUD_EXIT_DURATION,
          ease: "back.in(1.8)",
          stagger: 0.1,
          onComplete: hideHudPanelElements,
        },
        INTRO_HUD_EXIT_START,
      );
    }

    // 3) Skor kartı ortada yavaş bouncy belirir
    tl.to(
      card,
      {
        scale: 1,
        opacity: 1,
        duration: INTRO_CARD_IN_DURATION,
        ease: "back.out(1.6)",
      },
      INTRO_CARD_IN_START,
    );

    // 4) Halka belirir — scale/opacity; dönüş ayrı sürekli tween
    tl.fromTo(
      badge,
      { scale: 0, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        duration: badgeGrowDuration,
        ease: "power2.out",
        transformOrigin: "50% 50%",
      },
      badgeSpinStart,
    );
    tl.add(
      () => {
        const rot = Number(gsap.getProperty(badge, "rotation")) || -73;
        startRingSpin(rot);
      },
      badgeSpinStart,
    );

    // Halka merkeze doğru küçülürken dönüş devam eder
    tl.to(
      badge,
      {
        scale: 0,
        opacity: 0,
        duration: 1.15,
        ease: "sine.inOut",
        force3D: true,
        transformOrigin: "50% 50%",
        onComplete: () => stopRingSpin(),
      },
      badgeShrinkStart,
    );

    // Kart aşağı, skorboard yukarı açılır
    tl.to(
      stage,
      { y: INTRO_Y + CARD_DROP, duration: stageDropDuration, ease: "power2.inOut" },
      stageDropStart,
    );
    tl.to(
      boardClip,
      {
        height: boardFullH,
        duration: boardRevealDuration,
        ease: "power3.out",
        roundProps: "height",
        onComplete: () => {
          boardClip.style.overflow = "visible";
        },
      },
      boardRevealStart,
    );
    tl.call(
      () => {
        finalStageY = computeFinalY();
      },
      [],
      stageFinalStart,
    );
    tl.to(
      stage,
      {
        y: function () {
          return finalStageY;
        },
        duration: stageFinalDuration,
        ease: "power2.inOut",
      },
      stageFinalStart,
    );

    // Buttons
    tl.to(
      homeBtn,
      { y: 0, opacity: 1, duration: 1.0, ease: "back.out(1.35)" },
      buttonsStart,
    );
    tl.to(
      againBtn,
      { y: 0, opacity: 1, duration: 1.0, ease: "back.out(1.35)" },
      buttonsStart + 0.25,
    );

    return () => {
      tl.kill();
      stopRingSpin();
      restoreHudPanelElements();
    };
  }, [designScale, freezeScene, instant]);

  /* ─── RENDER ─── */
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[60] overflow-hidden"
      aria-live="polite"
    >
      {/* Blur backdrop */}
      <div
        ref={blurRef}
        className="fixed inset-0"
        style={{
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          backgroundColor: "rgba(229, 229, 229, 0.68)",
        }}
      />

      {/* Center stage */}
      <div className="flex h-full w-full items-center justify-center">
        <div
          ref={scaleWrapRef}
          style={{
            transform: `scale(${designScale})`,
            transformOrigin: "center center",
            marginTop: -RESULTS_STACK_LIFT,
          }}
        >
          <div
            ref={stageRef}
            className="relative overflow-visible"
            style={{ width: PLAYER_CARD_W, minHeight: PLAYER_CARD_H }}
          >
            {/* Scoreboard (above card, clipped) */}
            <div
              ref={boardClipRef}
              className="absolute left-0 w-full overflow-hidden"
              style={{
                height: 0,
                bottom: `calc(100% + ${SCOREBOARD_CARD_GAP}px)`,
              }}
            >
              <div ref={boardInnerRef}>
                <ScoreboardTable entries={leaderboard} />
              </div>
            </div>

            {/* Card + Badge */}
            <div ref={cardRef} className="relative">
              {/* Badge (centered on card) */}
              <div
                ref={badgeWrapRef}
                className="pointer-events-none absolute z-[0]"
                style={{
                  width: RING_DISPLAY_PX,
                  height: RING_DISPLAY_PX,
                  left: -CARD_OFFSET_X,
                  top: -CARD_OFFSET_Y,
                  transformOrigin: "50% 50%",
                  backfaceVisibility: "hidden",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ringSrc}
                  alt=""
                  className="h-full w-full object-contain"
                  draggable={false}
                />
              </div>

              {/* Score card */}
              <div className="relative z-[2]">
                <PlayerScoreCard
                  hex={playerHex}
                  score={score}
                  refs={{
                    root: cardRootRef,
                    avatar: avatarCellRef,
                    hex: hexCellRef,
                    label: labelCellRef,
                    score: scoreCellRef,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Buttons — Figma alt boşluk; skor kartının altında kalır */}
      <div
        className="fixed left-1/2 z-[3] flex -translate-x-1/2 items-center gap-6"
        style={{ bottom: BUTTONS_BOTTOM }}
      >
        <div ref={homeBtnRef}>
          <PressButton
            label="HOME"
            width={120}
            height={60}
            onClick={() => router.push("/")}
          />
        </div>
        <div ref={againBtnRef}>
          <PressButton
            label="AGAIN!"
            width={120}
            height={60}
            onClick={onPlayAgain}
          />
        </div>
      </div>
    </div>
  );
}
