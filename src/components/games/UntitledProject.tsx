"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import ScoreSideReveal from "@/components/games/ScoreSideReveal";
import { UntitledFileTab } from "@/components/games/untitled/UntitledFileTab";
import { UntitledSaveDialog } from "@/components/games/untitled/UntitledSaveDialog";
import { GameDescBox } from "@/components/GameDescBox";
import { GameIntroOverlay } from "@/components/GameIntroOverlay";
import { scoreFromUntitledSaves } from "@/components/games/scoreUtils";
import {
  GAME_REVEAL_STAGGER,
  introPendingPhase,
  prepareGameContentHidden,
  runGameContentReveal,
  shouldSkipIntroCard,
} from "@/lib/gameIntro";
import { useGameIntroPlay } from "@/lib/useGameIntroPlay";
import { randomIntInclusive } from "@/lib/scoring";
import {
  SHELL_PANEL_INSET_X,
  SHELL_PANEL_TOP,
  SHELL_SCORE_PANEL_WIDTH,
} from "@/lib/gameShellLayout";

interface UntitledProjectProps {
  gameKey: string;
  isPlaying: boolean;
  shellReady: boolean;
  onAnswer: (correct: boolean) => void;
  onGameStart: () => void;
  onIntroComplete: () => void;
  attemptIndex?: number;
  addRoundScore: (points: number) => void;
  onGameComplete?: () => void;
  endGame?: () => void;
  round: number;
  timeLeft: number;
}

type FileStatus = "open" | "saved" | "discarded";

type TabLayout = {
  leftPct: number;
  topPct: number;
  slotIndex: number;
  z: number;
};

type ProjectFile = {
  id: number;
  name: string;
  previewDepth: number;
  spawnDelayMs: number;
  burstPop: boolean;
  popOffsetX: number;
  popOffsetY: number;
  status: FileStatus;
  layout: TabLayout;
};

type ActiveModal = { fileId: number; fileName: string };
type Phase = "intro" | "playing";

const TOTAL_FILES = 22;
const PREVIEW_DEPTHS = [8, 16, 32] as const;
const DESC_BODY =
  "Save as many files as possible before your computer crashes and humbles your creative confidence.";

/** Sekme genişliği (~%) — çarpışma kontrolü için */
const TAB_W_PCT = 22;
const TAB_H_PCT = 6;
const DESC_BOX_WIDTH = 222;
const BASE_TAB_Z = 1;

function randomPreviewDepth() {
  return PREVIEW_DEPTHS[randomIntInclusive(0, PREVIEW_DEPTHS.length - 1)];
}

function formatFileLabel(name: string, previewDepth: number) {
  return `${name}* (RGB Preview - ${previewDepth}#)`;
}

function randomPopOffset() {
  const sign = () => (Math.random() > 0.5 ? 1 : -1);
  return {
    x: sign() * randomIntInclusive(10, 22),
    y: sign() * randomIntInclusive(10, 22),
  };
}

function makeFile(
  id: number,
  name: string,
  layout: TabLayout,
  spawnDelayMs: number,
  burstPop = false,
): ProjectFile {
  const offset = burstPop ? randomPopOffset() : { x: 0, y: 0 };
  return {
    id,
    name,
    previewDepth: randomPreviewDepth(),
    spawnDelayMs,
    burstPop,
    popOffsetX: offset.x,
    popOffsetY: offset.y,
    status: "open",
    layout,
  };
}

/** Üst chrome bölgesinde yatay kısıt (playfield yüksekliğinin %) */
const TOP_STRICT_ZONE_PCT = 16;
/** Strict → geniş geçiş bandı (%) */
const SIDE_RELAX_BAND_PCT = 10;
/** Alt bölgede kenar yasağını gevşetme (px) */
const BOTTOM_SIDE_RELAX_PX = 240;
/** Tam gevşek modda minimum kenar boşluğu (px) */
const BOTTOM_MIN_SIDE_PX = 10;
/** Desc/skor satırının altından ek dikey boşluk (px) */
const TOP_CHROME_CLEARANCE_PX = 16;
/** Desc kutusu tahmini yüksekliği (px) */
const DESC_STACK_HEIGHT_PX = 100;
/** Sol desc + sağ skor panelinden yatay güvenlik payı (px) */
const SIDE_CHROME_GAP_PX = 8;
/** Skor paneli yığın tahmini yüksekliği (px) — HEX + rakamlar + timer */
const SCORE_STACK_HEIGHT_PX = 174;
/** Sekme tahmini yüksekliği (px) */
const TAB_HEIGHT_PX = 47;
/** Alt footer (created by stüdyo) için dikey boşluk (px) */
const BOTTOM_FOOTER_CLEARANCE_PX = 72;
/** Sağ alt logo köşesi — yatay güvenlik (px) */
const FOOTER_CORNER_RIGHT_PX = 140;
/** Alt bölgede footer kısıtının devreye girdiği yükseklik bandı (%) */
const FOOTER_ZONE_HEIGHT_PCT = 14;
/** İlk burst — oyun alanı görünür olduktan sonra mount (ms) */
const BURST_REVEAL_DELAY_MS = Math.round(GAME_REVEAL_STAGGER * 1000) + 160;
/** İlk burst — kutular arası teker teker belirme aralığı (ms) */
const BURST_SPAWN_STAGGER_MS = 58;

function minTopPct(playfieldHeight: number): number {
  const h = Math.max(playfieldHeight, 480);
  const chromeBottomPx = Math.max(
    SHELL_PANEL_TOP + DESC_STACK_HEIGHT_PX,
    SHELL_PANEL_TOP + SCORE_STACK_HEIGHT_PX,
  );
  const minTopPx = chromeBottomPx + TOP_CHROME_CLEARANCE_PX;
  return Math.min(
    100 - TAB_H_PCT,
    Math.max(8, Math.ceil((minTopPx / h) * 100)),
  );
}

function sideRelaxFactor(topPct: number, topMinPct: number): number {
  const strictCeil = Math.max(TOP_STRICT_ZONE_PCT, topMinPct + 4);
  if (topPct <= strictCeil) return 0;
  if (topPct >= strictCeil + SIDE_RELAX_BAND_PCT) return 1;
  return (topPct - strictCeil) / SIDE_RELAX_BAND_PCT;
}

function maxTopPct(playfieldHeight: number): number {
  const h = Math.max(playfieldHeight, 480);
  const maxTopPx = h - TAB_HEIGHT_PX - BOTTOM_FOOTER_CLEARANCE_PX;
  return Math.min(100 - TAB_H_PCT, Math.floor((maxTopPx / h) * 100));
}

function footerStrictFactor(topPct: number, topMax: number): number {
  const zoneStart = topMax - FOOTER_ZONE_HEIGHT_PCT;
  if (topPct <= zoneStart) return 0;
  if (topPct >= topMax) return 1;
  return (topPct - zoneStart) / FOOTER_ZONE_HEIGHT_PCT;
}

function tabHorizontalBounds(
  playfieldWidth: number,
  topPct: number,
  topMinPct: number,
  topMaxPct: number,
) {
  const w = Math.max(playfieldWidth, 320);
  const relax = sideRelaxFactor(topPct, topMinPct);
  const footerFactor = footerStrictFactor(topPct, topMaxPct);

  const strictLeftPx =
    SHELL_PANEL_INSET_X + DESC_BOX_WIDTH + SIDE_CHROME_GAP_PX;
  const strictRightPx =
    SHELL_PANEL_INSET_X + SHELL_SCORE_PANEL_WIDTH + SIDE_CHROME_GAP_PX;
  const footerRightPx = SHELL_PANEL_INSET_X + FOOTER_CORNER_RIGHT_PX;
  const leftPx = Math.max(
    BOTTOM_MIN_SIDE_PX,
    strictLeftPx - relax * BOTTOM_SIDE_RELAX_PX,
  );
  let rightPx = Math.max(
    BOTTOM_MIN_SIDE_PX,
    strictRightPx - relax * BOTTOM_SIDE_RELAX_PX,
  );
  rightPx = Math.max(
    rightPx,
    strictRightPx + footerFactor * (footerRightPx - strictRightPx),
  );

  const minLeft = (leftPx / w) * 100;
  const maxLeft = 100 - TAB_W_PCT - (rightPx / w) * 100;

  return {
    minLeft: Math.max(0, minLeft),
    maxLeft: Math.min(100 - TAB_W_PCT, maxLeft),
  };
}

function randomLayout(
  peers: ProjectFile[],
  playfieldWidth: number,
  playfieldHeight: number,
): TabLayout {
  const topMin = minTopPct(playfieldHeight);
  const topMax = Math.max(topMin, maxTopPct(playfieldHeight));
  const strictCeil = Math.max(TOP_STRICT_ZONE_PCT, topMin + 4);

  for (let attempt = 0; attempt < 48; attempt++) {
    const topPct = randomIntInclusive(topMin, topMax);
    const { minLeft, maxLeft } = tabHorizontalBounds(
      playfieldWidth,
      topPct,
      topMin,
      topMax,
    );
    const leftLo = Math.ceil(minLeft);
    const leftHi = Math.floor(maxLeft);
    const leftPct =
      leftLo <= leftHi
        ? randomIntInclusive(leftLo, leftHi)
        : randomIntInclusive(0, 100 - TAB_W_PCT);

    const crowded = peers.some((p) => {
      const dx = Math.abs(p.layout.leftPct - leftPct);
      const dy = Math.abs(p.layout.topPct - topPct);
      return dx < TAB_W_PCT * 0.48 && dy < TAB_H_PCT * 1.05;
    });
    if (!crowded) {
      return {
        leftPct,
        topPct,
        slotIndex: attempt,
        z: randomIntInclusive(1, 24),
      };
    }
  }

  const topPct = randomIntInclusive(
    Math.min(strictCeil + SIDE_RELAX_BAND_PCT, topMax),
    topMax,
  );
  const { minLeft, maxLeft } = tabHorizontalBounds(
    playfieldWidth,
    topPct,
    minTopPct(playfieldHeight),
    topMax,
  );
  const leftLo = Math.ceil(minLeft);
  const leftHi = Math.floor(maxLeft);

  return {
    leftPct: leftLo <= leftHi ? randomIntInclusive(leftLo, leftHi) : 36,
    topPct,
    slotIndex: randomIntInclusive(0, 999),
    z: randomIntInclusive(1, 24),
  };
}

function playfieldSize(ref: HTMLDivElement | null) {
  const rect = ref?.getBoundingClientRect();
  return {
    width: rect?.width ?? window.innerWidth,
    height: rect?.height ?? window.innerHeight * 0.72,
  };
}

function makeInitialFiles(
  playfieldWidth: number,
  playfieldHeight: number,
): ProjectFile[] {
  const out: ProjectFile[] = [];
  for (let i = 0; i < TOTAL_FILES; i++) {
    const layout = randomLayout(out, playfieldWidth, playfieldHeight);
    out.push(
      makeFile(
        i + 1,
        `Untitled-${i + 1}`,
        { ...layout, z: BASE_TAB_Z + i },
        0,
        true,
      ),
    );
  }
  return out;
}

export default function UntitledProject({
  gameKey,
  isPlaying,
  shellReady,
  onGameStart,
  onIntroComplete,
  attemptIndex,
  addRoundScore,
  onGameComplete,
  endGame,
  round,
  timeLeft,
}: UntitledProjectProps) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [exitingIds, setExitingIds] = useState<Set<number>>(new Set());
  const [flyScore, setFlyScore] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [tabsRevealed, setTabsRevealed] = useState(false);
  const [burstVisibleCount, setBurstVisibleCount] = useState(0);
  const [burstDone, setBurstDone] = useState(false);
  const burstTimerRef = useRef<number | null>(null);

  const saveBtnRef = useRef<HTMLButtonElement>(null);
  const playfieldRef = useRef<HTMLDivElement>(null);
  const descBoxRef = useRef<HTMLDivElement>(null);
  const endedRef = useRef(false);
  const savedCountRef = useRef(0);
  const pendingScoreRef = useRef(0);
  const nextIdRef = useRef(TOTAL_FILES + 1);
  const zTopRef = useRef(BASE_TAB_Z + TOTAL_FILES);
  const onGameStartRef = useRef(onGameStart);
  const onIntroCompleteRef = useRef(onIntroComplete);

  useEffect(() => {
    onGameStartRef.current = onGameStart;
  }, [onGameStart]);

  useEffect(() => {
    onIntroCompleteRef.current = onIntroComplete;
  }, [onIntroComplete]);

  const handleIntroDismiss = useCallback(() => {
    onIntroCompleteRef.current();
    setPhase("playing");
  }, []);

  const {
    cardRef: introCardRef,
    playEnabled: introPlayEnabled,
    playPressed: introPlayPressed,
    handlePlay: handleIntroPlay,
  } = useGameIntroPlay({
    active: shellReady && phase === "intro",
    onDismiss: handleIntroDismiss,
  });

  useEffect(() => {
    savedCountRef.current = savedCount;
  }, [savedCount]);

  useEffect(() => {
    if (!shellReady) return;
    endedRef.current = false;
    nextIdRef.current = TOTAL_FILES + 1;
    zTopRef.current = BASE_TAB_Z + TOTAL_FILES;
    queueMicrotask(() => {
      const { width, height } = playfieldSize(playfieldRef.current);
      setSavedCount(0);
      setFiles(makeInitialFiles(width, height));
      setActiveModal(null);
      setExitingIds(new Set());
      setFlyScore(null);
      setTabsRevealed(false);
      setBurstVisibleCount(0);
      setBurstDone(false);
      if (shouldSkipIntroCard(attemptIndex)) {
        onIntroCompleteRef.current();
        setPhase("playing");
      } else {
        setPhase("intro");
      }
    });
  }, [shellReady, gameKey, attemptIndex]);

  useEffect(() => {
    if (phase !== "playing") return;

    const t = window.setTimeout(() => {
      setBurstVisibleCount(0);
      setBurstDone(false);
      setTabsRevealed(true);
    }, BURST_REVEAL_DELAY_MS);

    return () => window.clearTimeout(t);
  }, [phase, gameKey]);

  useEffect(() => {
    if (!tabsRevealed || burstDone) return;

    const total = files.length;
    if (total === 0) return;

    let count = 0;

    const tick = () => {
      count += 1;
      setBurstVisibleCount(count);
      if (count >= total) {
        setBurstDone(true);
        burstTimerRef.current = null;
        return;
      }
      burstTimerRef.current = window.setTimeout(tick, BURST_SPAWN_STAGGER_MS);
    };

    burstTimerRef.current = window.setTimeout(tick, 0);

    return () => {
      if (burstTimerRef.current !== null) {
        window.clearTimeout(burstTimerRef.current);
        burstTimerRef.current = null;
      }
    };
  }, [tabsRevealed, burstDone, files.length, gameKey]);

  useLayoutEffect(() => {
    if (phase !== "playing") return;
    prepareGameContentHidden({
      desc: descBoxRef.current,
    });
  }, [phase, gameKey]);

  useEffect(() => {
    if (phase !== "playing") return;

    const tl = runGameContentReveal(
      { desc: descBoxRef.current },
      () => onGameStartRef.current(),
    );

    return () => {
      tl.kill();
    };
  }, [phase, gameKey]);

  const handleScoreLand = useCallback(() => {
    addRoundScore(pendingScoreRef.current);
  }, [addRoundScore]);

  const handleScoreFlyComplete = useCallback(() => {
    setFlyScore(null);
    endGame?.();
    onGameComplete?.();
  }, [endGame, onGameComplete]);

  useEffect(() => {
    if (
      phase !== "playing" ||
      !isPlaying ||
      timeLeft > 0 ||
      endedRef.current ||
      flyScore !== null
    ) {
      return;
    }
    endedRef.current = true;
    setActiveModal(null);
    const points = scoreFromUntitledSaves(savedCountRef.current);
    pendingScoreRef.current = points;
    setFlyScore(points);
  }, [phase, isPlaying, timeLeft, flyScore]);

  const removeFileAfterFade = useCallback(
    (fileId: number, wasSaved: boolean) => {
      setExitingIds((prev) => new Set(prev).add(fileId));
      window.setTimeout(() => {
        if (endedRef.current) return;

        setFiles((prev) => {
          const next = prev.filter((f) => f.id !== fileId);
          const { width, height } = playfieldSize(playfieldRef.current);
          while (next.length < TOTAL_FILES) {
            const id = nextIdRef.current++;
            zTopRef.current += 1;
            next.push(
              makeFile(
                id,
                `Untitled-${randomIntInclusive(2, 23)}`,
                {
                  ...randomLayout(next, width, height),
                  z: zTopRef.current,
                },
                randomIntInclusive(0, 35),
                false,
              ),
            );
          }
          return next;
        });
        setExitingIds((prev) => {
          const n = new Set(prev);
          n.delete(fileId);
          return n;
        });
        if (wasSaved) {
          setSavedCount((c) => {
            const n = c + 1;
            savedCountRef.current = n;
            return n;
          });
        }
      }, 150);
    },
    [],
  );

  const openCloseModal = useCallback((file: ProjectFile) => {
    if (phase !== "playing" || endedRef.current || activeModal) return;
    zTopRef.current += 1;
    const nextZ = zTopRef.current;
    setFiles((prev) =>
      prev.map((f) =>
        f.id === file.id ? { ...f, layout: { ...f.layout, z: nextZ } } : f,
      ),
    );
    setActiveModal({ fileId: file.id, fileName: file.name });
  }, [activeModal, phase]);

  useEffect(() => {
    if (!activeModal) return;
    const t = window.setTimeout(() => saveBtnRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [activeModal]);

  useEffect(() => {
    if (!activeModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveBtnRef.current?.click();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setActiveModal(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeModal]);

  const handleModalSave = useCallback(() => {
    if (!activeModal) return;
    const id = activeModal.fileId;
    setActiveModal(null);
    removeFileAfterFade(id, true);
  }, [activeModal, removeFileAfterFade]);

  const handleModalDontSave = useCallback(() => {
    if (!activeModal) return;
    const id = activeModal.fileId;
    setActiveModal(null);
    removeFileAfterFade(id, false);
  }, [activeModal, removeFileAfterFade]);

  const handleModalCancel = useCallback(() => {
    setActiveModal(null);
  }, []);

  const introActive = introPendingPhase(phase);

  return (
    <div className="absolute inset-0 overflow-hidden font-sans">
      <GameIntroOverlay
        ref={introCardRef}
        gameId="untitled-project"
        description={DESC_BODY}
        playEnabled={introPlayEnabled}
        playPressed={introPlayPressed}
        onPlay={handleIntroPlay}
      />

      <div
        ref={playfieldRef}
        className="absolute inset-0 overflow-hidden"
        style={{
          visibility: phase === "intro" ? "hidden" : "visible",
          pointerEvents: phase === "intro" ? "none" : "auto",
        }}
      >
        {phase === "playing" && tabsRevealed
          ? files.map((f, index) => {
              if (f.burstPop && !burstDone && index >= burstVisibleCount) {
                return null;
              }
              const isExiting = exitingIds.has(f.id);
              const { leftPct, topPct, z } = f.layout;
              return (
                <UntitledFileTab
                  key={f.id}
                  label={formatFileLabel(f.name, f.previewDepth)}
                  leftPct={leftPct}
                  topPct={topPct}
                  z={z}
                  burstPop={f.burstPop}
                  popOffsetX={f.popOffsetX}
                  popOffsetY={f.popOffsetY}
                  isExiting={isExiting}
                  onClose={() => openCloseModal(f)}
                  onFocus={() => {
                    zTopRef.current += 1;
                    const nextZ = zTopRef.current;
                    setFiles((prev) =>
                      prev.map((item) =>
                        item.id === f.id
                          ? { ...item, layout: { ...item.layout, z: nextZ } }
                          : item,
                      ),
                    );
                  }}
                />
              );
            })
          : null}

        {activeModal ? (
          <UntitledSaveDialog
            fileName={activeModal.fileName}
            saveBtnRef={saveBtnRef}
            onSave={handleModalSave}
            onDontSave={handleModalDontSave}
            onCancel={handleModalCancel}
          />
        ) : null}
      </div>

      <GameDescBox
        ref={descBoxRef}
        gameId="untitled-project"
        style={{
          zIndex: 20,
          ...(introActive
            ? { visibility: "hidden", pointerEvents: "none" }
            : undefined),
        }}
      >
        {DESC_BODY}
      </GameDescBox>

      {flyScore !== null && (
        <ScoreSideReveal
          key={`${gameKey}-${round}-${flyScore}`}
          points={flyScore}
          flyTargetLift={100}
          onScoreLand={handleScoreLand}
          onComplete={handleScoreFlyComplete}
        />
      )}
    </div>
  );
}
