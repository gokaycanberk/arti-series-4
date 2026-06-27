"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ScoreSideReveal from "@/components/games/ScoreSideReveal";
import { scoreFromUntitledSaves } from "@/components/games/scoreUtils";
import { randomIntInclusive } from "@/lib/scoring";
import { SHELL_GAME_SAFE_INSET, SHELL_GAME_TOP_OFFSET } from "@/lib/gameShellLayout";

interface UntitledProjectProps {
  gameKey: string;
  isPlaying: boolean;
  shellReady: boolean;
  onAnswer: (correct: boolean) => void;
  onGameStart: () => void;
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

const TOTAL_FILES = 15;
const TAB_SUFFIX = "@ 23,72 % (RGB/Preview)";

/** Sekme genişliği (~%) — çarpışma kontrolü için */
const TAB_W_PCT = 26;
const TAB_H_PCT = 9;
const MODAL_Z = 100;
const BASE_TAB_Z = 1;

function randomLayout(peers: ProjectFile[]): TabLayout {
  for (let attempt = 0; attempt < 48; attempt++) {
    const leftPct = randomIntInclusive(0, 100 - TAB_W_PCT);
    const topPct = randomIntInclusive(0, 100 - TAB_H_PCT);
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

  return {
    leftPct: randomIntInclusive(0, 100 - TAB_W_PCT),
    topPct: randomIntInclusive(0, 100 - TAB_H_PCT),
    slotIndex: randomIntInclusive(0, 999),
    z: randomIntInclusive(1, 24),
  };
}

function makeInitialFiles(): ProjectFile[] {
  const out: ProjectFile[] = [];
  for (let i = 0; i < TOTAL_FILES; i++) {
    out.push({
      id: i + 1,
      name: `Untitled-${i + 1}`,
      status: "open",
      layout: randomLayout(out),
    });
  }
  return out;
}

export default function UntitledProject({
  gameKey,
  isPlaying,
  shellReady,
  onGameStart,
  addRoundScore,
  onGameComplete,
  endGame,
  round,
  timeLeft,
}: UntitledProjectProps) {
  const [files, setFiles] = useState<ProjectFile[]>(() => makeInitialFiles());
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [exitingIds, setExitingIds] = useState<Set<number>>(new Set());
  const [flyScore, setFlyScore] = useState<number | null>(null);
  const [scoreOrigin, setScoreOrigin] = useState<{ x: number; y: number } | null>(
    null,
  );

  const saveBtnRef = useRef<HTMLButtonElement>(null);
  const playfieldRef = useRef<HTMLDivElement>(null);
  const endedRef = useRef(false);
  const savedCountRef = useRef(0);
  const pendingScoreRef = useRef(0);
  const nextIdRef = useRef(TOTAL_FILES + 1);
  const zTopRef = useRef(BASE_TAB_Z + TOTAL_FILES);
  const startedRef = useRef(false);

  const panicMode = isPlaying && timeLeft <= 3;

  useEffect(() => {
    savedCountRef.current = savedCount;
  }, [savedCount]);

  useEffect(() => {
    if (!shellReady) return;
    endedRef.current = false;
    startedRef.current = false;
    savedCountRef.current = 0;
    nextIdRef.current = TOTAL_FILES + 1;
    zTopRef.current = BASE_TAB_Z + TOTAL_FILES;
    queueMicrotask(() => {
      setSavedCount(0);
      setFiles(makeInitialFiles());
      setActiveModal(null);
      setActiveTabId(null);
      setExitingIds(new Set());
      setFlyScore(null);
      setScoreOrigin(null);
    });
  }, [shellReady, gameKey]);

  useEffect(() => {
    if (!shellReady || startedRef.current) return;
    startedRef.current = true;
    onGameStart();
  }, [shellReady, gameKey, onGameStart]);

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
    if (!isPlaying || timeLeft > 0 || endedRef.current || flyScore !== null) {
      return;
    }
    endedRef.current = true;
    setActiveModal(null);
    const points = scoreFromUntitledSaves(savedCountRef.current);
    pendingScoreRef.current = points;
    setScoreOrigin(resolveScoreOrigin());
    setFlyScore(points);
  }, [isPlaying, timeLeft, flyScore, resolveScoreOrigin]);

  const removeFileAfterFade = useCallback(
    (fileId: number, wasSaved: boolean) => {
      setExitingIds((prev) => new Set(prev).add(fileId));
      window.setTimeout(() => {
        if (endedRef.current) return;

        setFiles((prev) => {
          const next = prev.filter((f) => f.id !== fileId);
          while (next.length < TOTAL_FILES) {
            const id = nextIdRef.current++;
            next.push({
              id,
              name: `Untitled-${randomIntInclusive(2, 23)}`,
              status: "open",
              layout: randomLayout(next),
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
    if (endedRef.current || activeModal) return;
    zTopRef.current += 1;
    const nextZ = zTopRef.current;
    setFiles((prev) =>
      prev.map((f) =>
        f.id === file.id ? { ...f, layout: { ...f.layout, z: nextZ } } : f,
      ),
    );
    setActiveTabId(file.id);
    setActiveModal({ fileId: file.id, fileName: file.name });
  }, [activeModal]);

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

  return (
    <div
      className={`absolute right-0 bottom-0 left-0 flex min-h-0 flex-col overflow-hidden font-sans transition-shadow duration-300 ${
        panicMode
          ? "shadow-[0_0_0_3px_rgba(239,68,68,0.85),inset_0_0_40px_rgba(239,68,68,0.12)]"
          : ""
      }`}
      style={{
        top: SHELL_GAME_TOP_OFFSET,
        backgroundColor: "#D4D4D4",
      }}
    >
      {panicMode ? (
        <div
          className="pointer-events-none absolute inset-0 z-[5] animate-pulse ring-2 ring-red-500/70"
          style={{ animationDuration: "0.9s" }}
          aria-hidden
        />
      ) : null}

      <div
        ref={playfieldRef}
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{
          backgroundColor: "#D4D4D4",
          paddingTop: SHELL_GAME_SAFE_INSET.top,
          paddingLeft: SHELL_GAME_SAFE_INSET.left,
          paddingRight: SHELL_GAME_SAFE_INSET.right,
          paddingBottom: SHELL_GAME_SAFE_INSET.bottom,
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

      {flyScore !== null && scoreOrigin && (
        <ScoreSideReveal
          key={`${gameKey}-${round}-${flyScore}`}
          points={flyScore}
          anchorRef={playfieldRef}
          origin={scoreOrigin}
          variant="gradient-guru"
          onScoreLand={handleScoreLand}
          onComplete={handleScoreFlyComplete}
        />
      )}
    </div>
  );
}
