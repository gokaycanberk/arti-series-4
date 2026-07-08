"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import ScoreSideReveal from "@/components/games/ScoreSideReveal";
import { GameDescBox } from "@/components/GameDescBox";
import { GameIntroOverlay } from "@/components/GameIntroOverlay";
import { scoreFromUntitledSaves } from "@/components/games/scoreUtils";
import {
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
  status: FileStatus;
  layout: TabLayout;
};

type ActiveModal = { fileId: number; fileName: string };
type Phase = "intro" | "playing";

const TOTAL_FILES = 15;
const TAB_SUFFIX = "@ 23,72 % (RGB/Preview)";
const DESC_BODY =
  "Save as many files as possible before your computer crashes and humbles your creative confidence.";

/** Sekme genişliği (~%) — çarpışma kontrolü için */
const TAB_W_PCT = 26;
const TAB_H_PCT = 9;
const DESC_BOX_WIDTH = 222;
const MODAL_Z = 100;
const BASE_TAB_Z = 1;

/** Üst bölgede sol/sağ chrome ile çakışmayı önle (playfield yüksekliğinin %) */
const TOP_STRICT_ZONE_PCT = 30;
/** Strict → geniş geçiş bandı (%) */
const SIDE_RELAX_BAND_PCT = 16;
/** Alt bölgede kenar yasağını gevşetme (px) */
const BOTTOM_SIDE_RELAX_PX = 185;
/** Tam gevşek modda minimum kenar boşluğu (px) */
const BOTTOM_MIN_SIDE_PX = 18;
/** Desc/skor satırının altından ek dikey boşluk (px) */
const TOP_CHROME_CLEARANCE_PX = 88;
/** Desc kutusu tahmini yüksekliği (px) */
const DESC_STACK_HEIGHT_PX = 120;

function minTopPct(playfieldHeight: number): number {
  const h = Math.max(playfieldHeight, 480);
  const minTopPx = SHELL_PANEL_TOP + DESC_STACK_HEIGHT_PX + TOP_CHROME_CLEARANCE_PX;
  return Math.min(
    100 - TAB_H_PCT,
    Math.max(12, Math.ceil((minTopPx / h) * 100)),
  );
}

function sideRelaxFactor(topPct: number, topMinPct: number): number {
  const strictCeil = Math.max(TOP_STRICT_ZONE_PCT, topMinPct + 4);
  if (topPct <= strictCeil) return 0;
  if (topPct >= strictCeil + SIDE_RELAX_BAND_PCT) return 1;
  return (topPct - strictCeil) / SIDE_RELAX_BAND_PCT;
}

function tabHorizontalBounds(
  playfieldWidth: number,
  topPct: number,
  topMinPct: number,
) {
  const w = Math.max(playfieldWidth, 320);
  const relax = sideRelaxFactor(topPct, topMinPct);

  const strictLeftPx = SHELL_PANEL_INSET_X + DESC_BOX_WIDTH + 24;
  const strictRightPx = SHELL_PANEL_INSET_X + SHELL_SCORE_PANEL_WIDTH + 24;
  const leftPx = Math.max(
    BOTTOM_MIN_SIDE_PX,
    strictLeftPx - relax * BOTTOM_SIDE_RELAX_PX,
  );
  const rightPx = Math.max(
    BOTTOM_MIN_SIDE_PX,
    strictRightPx - relax * BOTTOM_SIDE_RELAX_PX,
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
  const topMax = 100 - TAB_H_PCT;
  const strictCeil = Math.max(TOP_STRICT_ZONE_PCT, topMin + 4);

  for (let attempt = 0; attempt < 48; attempt++) {
    const topPct = randomIntInclusive(topMin, topMax);
    const { minLeft, maxLeft } = tabHorizontalBounds(
      playfieldWidth,
      topPct,
      topMin,
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
      return dx < TAB_W_PCT * 0.55 && dy < TAB_H_PCT * 1.1;
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

  const topPct = randomIntInclusive(strictCeil + SIDE_RELAX_BAND_PCT, topMax);
  const { minLeft, maxLeft } = tabHorizontalBounds(
    playfieldWidth,
    topPct,
    minTopPct(playfieldHeight),
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
    out.push({
      id: i + 1,
      name: `Untitled-${i + 1}`,
      status: "open",
      layout: randomLayout(out, playfieldWidth, playfieldHeight),
    });
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
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [exitingIds, setExitingIds] = useState<Set<number>>(new Set());
  const [flyScore, setFlyScore] = useState<number | null>(null);
  const [scoreOrigin, setScoreOrigin] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [phase, setPhase] = useState<Phase>("intro");

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

  const panicMode = phase === "playing" && isPlaying && timeLeft <= 3;

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
      setActiveTabId(null);
      setExitingIds(new Set());
      setFlyScore(null);
      setScoreOrigin(null);
      if (shouldSkipIntroCard(attemptIndex)) {
        onIntroCompleteRef.current();
        setPhase("playing");
      } else {
        setPhase("intro");
      }
    });
  }, [shellReady, gameKey, attemptIndex]);

  useLayoutEffect(() => {
    if (phase !== "playing") return;
    prepareGameContentHidden({
      desc: descBoxRef.current,
      board: playfieldRef.current,
    });
  }, [phase, gameKey]);

  useEffect(() => {
    if (phase !== "playing") return;

    const tl = runGameContentReveal(
      { desc: descBoxRef.current, board: playfieldRef.current },
      () => onGameStartRef.current(),
    );

    return () => {
      tl.kill();
    };
  }, [phase, gameKey]);

  const resolveScoreOrigin = useCallback(() => {
    const el = playfieldRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      return {
        x: r.left + r.width / 2,
        y: r.top + r.height * 0.42,
      };
    }
    return {
      x: window.innerWidth / 2,
      y: window.innerHeight * 0.55,
    };
  }, []);

  const handleScoreLand = useCallback(() => {
    addRoundScore(pendingScoreRef.current);
  }, [addRoundScore]);

  const handleScoreFlyComplete = useCallback(() => {
    setFlyScore(null);
    setScoreOrigin(null);
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
    setScoreOrigin(resolveScoreOrigin());
    setFlyScore(points);
  }, [phase, isPlaying, timeLeft, flyScore, resolveScoreOrigin]);

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
            next.push({
              id,
              name: `Untitled-${randomIntInclusive(2, 23)}`,
              status: "open",
              layout: randomLayout(next, width, height),
            });
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
    setActiveTabId(file.id);
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

  if (!shellReady) {
    return null;
  }

  const introActive = introPendingPhase(phase);

  return (
    <div
      className={`absolute inset-0 overflow-hidden font-sans transition-shadow duration-300 ${
        panicMode
          ? "shadow-[0_0_0_3px_rgba(239,68,68,0.85),inset_0_0_40px_rgba(239,68,68,0.12)]"
          : ""
      }`}
      style={{ backgroundColor: "#D4D4D4" }}
    >
      <GameIntroOverlay
        ref={introCardRef}
        gameId="untitled-project"
        description={DESC_BODY}
        playEnabled={introPlayEnabled}
        playPressed={introPlayPressed}
        onPlay={handleIntroPlay}
      />

      {panicMode ? (
        <div
          className="pointer-events-none absolute inset-0 z-[5] animate-pulse ring-2 ring-red-500/70"
          style={{ animationDuration: "0.9s" }}
          aria-hidden
        />
      ) : null}

      <div
        ref={playfieldRef}
        className="absolute inset-0 overflow-hidden"
        style={{
          visibility: phase === "intro" ? "hidden" : "visible",
          pointerEvents: phase === "intro" ? "none" : "auto",
        }}
      >
        {files.map((f) => {
          const isActive = activeTabId === f.id;
          const isExiting = exitingIds.has(f.id);
          const { leftPct, topPct, z } = f.layout;
          return (
            <div
              key={f.id}
              className={`absolute flex w-[min(88%,15.5rem)] max-w-[15.5rem] min-h-[36px] items-stretch border border-[#1a1a1a] shadow-md transition-opacity duration-150 ${
                isExiting ? "pointer-events-none opacity-0" : "opacity-100"
              }`}
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                zIndex: z,
                backgroundColor: isActive ? "#404040" : "#333333",
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openCloseModal(f);
                }}
                className="flex min-h-[36px] min-w-[36px] shrink-0 items-center justify-center border-r border-[#1a1a1a] text-sm text-white/90 transition-colors hover:bg-red-600/25 hover:text-red-300"
                aria-label={`${f.name} sekmesini kapat`}
              >
                ✕
              </button>
              <button
                type="button"
                onClick={() => setActiveTabId(f.id)}
                className="flex min-w-0 flex-1 items-center overflow-hidden px-2 py-1.5 text-left text-[10px] leading-tight text-white sm:text-[11px]"
              >
                <span className="truncate" title={`${f.name}*${TAB_SUFFIX}`}>
                  {f.name}*{TAB_SUFFIX}
                </span>
              </button>
            </div>
          );
        })}

        {activeModal ? (
          <div
            className="absolute inset-0 flex items-center justify-center px-4 py-6"
            style={{ backgroundColor: "rgba(0,0,0,0.45)", zIndex: MODAL_Z }}
            role="presentation"
          >
            <div
              className="w-full max-w-md overflow-hidden rounded-lg p-0 shadow-2xl"
              style={{ backgroundColor: "#3E3E3E" }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="untitled-save-dialog-desc"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="border-b border-white/10 px-5 py-2 text-[11px] text-white/55">
                Adobe Illustrator
              </p>
              <div className="flex gap-4 px-5 pb-5 pt-4">
                <div
                  className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center text-2xl"
                  aria-hidden
                >
                  ⚠️
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    id="untitled-save-dialog-desc"
                    className="text-[13px] leading-relaxed text-white/95"
                  >
                    {`Save changes to the Adobe Illustrator document '${activeModal.fileName}*' before closing? If you don't save, your changes will be lost.`}
                  </p>
                  <div className="mt-6 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleModalDontSave}
                      className="rounded px-4 py-1.5 text-xs font-medium text-white transition hover:bg-[#555555]"
                      style={{ backgroundColor: "#454545" }}
                    >
                      Don&apos;t Save
                    </button>
                    <button
                      type="button"
                      onClick={handleModalCancel}
                      className="rounded px-4 py-1.5 text-xs font-medium text-white transition hover:bg-[#555555]"
                      style={{ backgroundColor: "#454545" }}
                    >
                      Cancel
                    </button>
                    <button
                      ref={saveBtnRef}
                      type="button"
                      onClick={handleModalSave}
                      className="rounded px-4 py-1.5 text-xs font-medium text-white transition hover:bg-[#005a9e]"
                      style={{ backgroundColor: "#0078D4" }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
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

      {flyScore !== null && scoreOrigin && (
        <ScoreSideReveal
          key={`${gameKey}-${round}-${flyScore}`}
          points={flyScore}
          anchorRef={playfieldRef}
          origin={scoreOrigin}
          variant="gradient-guru"
          flyTargetLift={100}
          onScoreLand={handleScoreLand}
          onComplete={handleScoreFlyComplete}
        />
      )}
    </div>
  );
}
