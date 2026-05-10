"use client";

import { GameShell } from "@/components/GameShell";
import type { GameShellChildState } from "@/components/GameShell";
import { getGameById } from "@/lib/games";
import { randomIntInclusive } from "@/lib/scoring";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

const GAME_ID = "untitled-project" as const;
const TOTAL_FILES = 15;

type FileStatus = "open" | "saved" | "discarded";

type TabLayout = {
  leftPct: number;
  topPct: number;
  /** Çakışmayı önlemek için sabit slot indeksi */
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

const TAB_SUFFIX = "@ 23,72 % (RGB/Preview)";

/** Yatay düz; üst üste binmeyen ~20 slot (yüzde, çalışma alanına göre). */
const TAB_SLOTS: readonly { leftPct: number; topPct: number }[] = (() => {
  const slots: { leftPct: number; topPct: number }[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      slots.push({
        leftPct: 2 + col * 18,
        topPct: 4 + row * 12,
      });
    }
  }
  return slots;
})();

function randomLayout(peers: ProjectFile[]): TabLayout {
  const used = new Set(peers.map((p) => p.layout.slotIndex));
  const free = TAB_SLOTS.map((_, i) => i).filter((i) => !used.has(i));
  const pick =
    free.length > 0 ?
      free[randomIntInclusive(0, free.length - 1)]!
    : randomIntInclusive(0, TAB_SLOTS.length - 1);
  const s = TAB_SLOTS[pick]!;
  return {
    leftPct: s.leftPct,
    topPct: s.topPct,
    slotIndex: pick,
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

function scoreFromSaved(saved: number): number {
  return Math.round((saved / TOTAL_FILES) * 100);
}

function UntitledGameplay({
  isPlaying,
  timeLeft,
  endGame,
  setLiveScoreGetter,
}: GameShellChildState) {
  const [files, setFiles] = useState<ProjectFile[]>(() => makeInitialFiles());
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [exitingIds, setExitingIds] = useState<Set<number>>(new Set());
  const [perfectFlash, setPerfectFlash] = useState(false);

  const saveBtnRef = useRef<HTMLButtonElement>(null);
  const endedRef = useRef(false);
  const savedCountRef = useRef(0);
  const nextIdRef = useRef(TOTAL_FILES + 1);

  const remaining = files.length;

  const panicMode = isPlaying && timeLeft <= 3;

  useEffect(() => {
    savedCountRef.current = savedCount;
  }, [savedCount]);

  useLayoutEffect(() => {
    setLiveScoreGetter?.(() => scoreFromSaved(savedCount));
  }, [savedCount, setLiveScoreGetter]);

  const finishPerfect = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setPerfectFlash(true);
    setActiveModal(null);
    setExitingIds(new Set());
    setFiles([]);
    endGame(100);
  }, [endGame]);

  const removeFileAfterFade = useCallback(
    (fileId: number, wasSaved: boolean) => {
      setExitingIds((prev) => new Set(prev).add(fileId));
      window.setTimeout(() => {
        if (endedRef.current) return;

        const nextSaved = wasSaved ? savedCountRef.current + 1 : savedCountRef.current;
        if (wasSaved && nextSaved >= TOTAL_FILES) {
          savedCountRef.current = TOTAL_FILES;
          setSavedCount(TOTAL_FILES);
          setExitingIds((prev) => {
            const n = new Set(prev);
            n.delete(fileId);
            return n;
          });
          queueMicrotask(() => finishPerfect());
          return;
        }

        setFiles((prev) => {
          const next = prev.filter((f) => f.id !== fileId);
          while (next.length < TOTAL_FILES) {
            const id = nextIdRef.current++;
            next.push({
              id,
              name: `Untitled-${id}`,
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
    [finishPerfect],
  );

  const openCloseModal = useCallback((file: ProjectFile) => {
    setActiveTabId(file.id);
    setActiveModal({ fileId: file.id, fileName: file.name });
  }, []);

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

  if (!isPlaying) {
    return null;
  }

  return (
    <div
      className={`font-sans relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-black/10 transition-shadow duration-300 ${
        panicMode ? "shadow-[0_0_0_3px_rgba(239,68,68,0.85),inset_0_0_40px_rgba(239,68,68,0.12)]" : ""
      }`}
      style={{
        backgroundColor: "#D4D4D4",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.65), inset 0 0 100px rgba(0,0,0,0.04)",
      }}
    >
      {panicMode ? (
        <div
          className="pointer-events-none absolute inset-0 z-[5] animate-pulse rounded-2xl ring-2 ring-red-500/70"
          style={{ animationDuration: "0.9s" }}
          aria-hidden
        />
      ) : null}

      {perfectFlash ? (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/45">
          <p className="rounded-lg bg-[#3E3E3E] px-8 py-4 text-lg font-semibold text-white shadow-xl">
            Perfect!
          </p>
        </div>
      ) : null}

      <div
        className="flex shrink-0 select-none items-center justify-between border-b border-black/25 px-3 py-1.5 text-[11px] text-white/90"
        style={{ backgroundColor: "#2C2C2C" }}
        aria-hidden
      >
        <span className="font-medium tracking-wide">Adobe Illustrator</span>
        <span className="tabular-nums text-white/70">
          {savedCount}/15 kayıt · {remaining} sekme
        </span>
      </div>

      {/* Sekmeler + düz “ekran altı” şerit (kareli desen yok) */}
      <div
        className="relative min-h-0 min-h-[min(20rem,calc(100vh-340px))] flex-1 overflow-hidden"
        style={{
          backgroundColor: "#D4D4D4",
          boxShadow: "inset 0 2px 6px rgba(0,0,0,0.06)",
        }}
      >
        {files.map((f) => {
          const isActive = activeTabId === f.id;
          const isExiting = exitingIds.has(f.id);
          const { leftPct, topPct, z } = f.layout;
          return (
            <div
              key={f.id}
              className={`absolute flex w-[min(92%,17.5rem)] max-w-[17.5rem] min-h-[36px] items-stretch border border-[#1a1a1a] shadow-md transition-opacity duration-150 ${
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

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[min(20%,5rem)] border-t border-black/12"
          style={{
            background: "linear-gradient(180deg, #cecece 0%, #b4b4b4 55%, #a8a8a8 100%)",
          }}
          aria-hidden
        />
      </div>

      {activeModal ? (
        <div
          className="absolute inset-0 z-[60] flex items-center justify-center px-4 py-6"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
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
  );
}

export default function UntitledProjectPage() {
  const game = getGameById(GAME_ID);

  if (!game) {
    return (
      <div className="mx-auto px-4 py-20 text-center text-sm">
        Oyun bulunamadı.
      </div>
    );
  }

  return (
    <GameShell
      resetKey={GAME_ID}
      gameName={game.name}
      description={game.description}
      duration={game.duration}
    >
      {(state) => <UntitledGameplay {...state} />}
    </GameShell>
  );
}
