"use client";

/* next/font/google yalnızca sunucu bileşenlerinde desteklenir; bu dosya use client.
 * Aşağıda aynı üç aileyi stylesheet üzerinden yükleyip document.fonts.ready ile bekliyoruz. */

import { GameShell } from "@/components/GameShell";
import type { GameShellChildState } from "@/components/GameShell";
import { getGameById } from "@/lib/games";
import { randomIntInclusive } from "@/lib/scoring";
import type { ChangeEvent, KeyboardEvent } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const GAME_ID = "glyph-guess" as const;
const DURATION = 45;

const GLYPH_POOL = ["A", "B", "D", "G", "K", "M", "N", "Q", "R", "S", "W"] as const;

const FONT_FAMILIES = [
  "Playfair Display",
  "Space Grotesk",
  "Instrument Serif",
] as const;

const FONT_STYLESHEETS = [
  "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400..900&display=swap",
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap",
  "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital,wght@0,400;0,600;1,400&display=swap",
] as const;

type Feedback = "correct" | "wrong" | null;

type RoundRecord = {
  target: string;
  guess: string;
  correct: boolean;
};

function combinationKey(letter: string, fontIdx: number) {
  return `${letter}-${fontIdx}`;
}

function pickLetterAndFont(used: Set<string>): { letter: string; fontIdx: number } {
  let candidates: { letter: string; fontIdx: number }[] = [];

  const rebuild = () => {
    candidates = [];
    for (const L of GLYPH_POOL)
      for (let f = 0; f < 3; f++) {
        const k = combinationKey(L, f);
        if (!used.has(k)) candidates.push({ letter: L, fontIdx: f });
      }
  };

  rebuild();
  if (candidates.length === 0) {
    used.clear();
    rebuild();
  }

  const pick = candidates[randomIntInclusive(0, candidates.length - 1)];
  used.add(combinationKey(pick.letter, pick.fontIdx));
  return pick;
}

function intersectArea(
  gl: number,
  gt: number,
  gw: number,
  gh: number,
  vw: number,
  vh: number,
): number {
  const iw = Math.min(vw, gl + gw) - Math.max(0, gl);
  const ih = Math.min(vh, gt + gh) - Math.max(0, gt);
  if (iw <= 0 || ih <= 0) return 0;
  return iw * ih;
}

function estimateGlyphBox(
  letter: string,
  fontFamilyName: string,
  fontSizePx: number,
): { gw: number; gh: number } {
  let canvas = document.querySelector<HTMLCanvasElement>("[data-glyph-measure-canvas]");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.setAttribute("data-glyph-measure-canvas", "1");
    canvas.width = canvas.height = 1;
    canvas.style.position = "absolute";
    canvas.style.left = "-9999px";
    canvas.style.top = "-9999px";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return { gw: fontSizePx * 0.7, gh: fontSizePx };
  ctx.font = `${fontSizePx}px "${fontFamilyName}", serif`;
  const m = ctx.measureText(letter);
  const ascent =
    typeof m.actualBoundingBoxAscent === "number"
      ? m.actualBoundingBoxAscent
      : fontSizePx * 0.72;
  const descent =
    typeof m.actualBoundingBoxDescent === "number"
      ? m.actualBoundingBoxDescent
      : fontSizePx * 0.2;

  let width = m.width;
  const abw =
    typeof m.actualBoundingBoxLeft === "number" &&
    typeof m.actualBoundingBoxRight === "number"
      ? m.actualBoundingBoxLeft + m.actualBoundingBoxRight
      : null;
  if (abw && abw > 0 && abw !== width * 2) width = Math.max(width, abw);

  const gh = ascent + descent;
  return {
    gw: Math.max(fontSizePx * 0.3, Math.min(width + 16, fontSizePx * 1.4)),
    gh: Math.max(fontSizePx * 0.5, gh),
  };
}

function randomCropOffsets(gw: number, gh: number, vw: number, vh: number) {
  for (let i = 0; i < 90; i++) {
    const top = randomIntInclusive(-250, -50);
    const left = randomIntInclusive(-200, -30);

    let gl = left;
    let gt = top;
    if (gt + gh < 6) gt = Math.min(-20, vw - gw - 8);

    let area = intersectArea(gl, gt, gw, gh, vw, vh);

    let best = area;
    for (let s = -12; s <= 12; s += 6) {
      for (let t = -12; t <= 12; t += 6) {
        let gl2 = left + s;
        let gt2 = top + t;
        gl2 = Math.min(40, Math.max(vw + gw - 280, gl2));
        gt2 = Math.min(-36, Math.max(-280, gt2));

        area = intersectArea(gl2, gt2, gw, gh, vw, vh);
        if (area > best) {
          best = area;
          gl = gl2;
          gt = gt2;
        }
      }
    }

    area = intersectArea(gl, gt, gw, gh, vw, vh);

    const minPix = vw * vh * 0.035;
    if (area >= minPix) return { top: gt, left: gl };
  }
  const top = randomIntInclusive(-220, -80);
  const left = randomIntInclusive(-180, -40);
  return { top, left };
}

function finalRoundScore(rounds: RoundRecord[]): number {
  if (rounds.length === 0) return 0;
  const correct = rounds.filter((r) => r.correct).length;
  return Math.round((correct / rounds.length) * 100);
}

/** Yalnızca Latin harfleri (A–Z / a–z); diğerini yok say. */
function sanitizeLetterInput(raw: string): string | null {
  const ch = raw.trim().slice(-1);
  if (!/^[a-z]$/i.test(ch)) return null;
  return ch.toUpperCase();
}

function GlyphGuessGameplay({
  isPlaying,
  setLiveScoreGetter,
}: Pick<GameShellChildState, "isPlaying"> & {
  setLiveScoreGetter?: (getter: () => number) => void;
}) {
  const [fontsReady, setFontsReady] = useState(false);
  const [currentLetter, setCurrentLetter] = useState("");
  const [currentFontIndex, setCurrentFontIndex] = useState(0);
  const [offsetTop, setOffsetTop] = useState(0);
  const [offsetLeft, setOffsetLeft] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [rounds, setRounds] = useState<RoundRecord[]>([]);

  const usedCombinationsRef = useRef<Set<string>>(new Set());

  const inputRef = useRef<HTMLInputElement>(null);
  /** Tarayıcıda `setTimeout` sayı döndürür; Node ile çakışan tiplerde `number` kullan. */
  const feedbackTimerRef = useRef<number | null>(null);
  const submitBusyRef = useRef(false);
  const bootstrapRoundOnceRef = useRef(false);

  const fontFamilyKey = FONT_FAMILIES[currentFontIndex] ?? FONT_FAMILIES[0];
  const fontStack =
    currentFontIndex === 1 ?
      `"${fontFamilyKey}", sans-serif`
    : `"${fontFamilyKey}", serif`;

  const viewportPx = useMemo(() => ({ w: 180, h: 180 }), []);
  const FONT_SIZE_PX = 350;

  const startFreshRound = useCallback(() => {
    const pick = pickLetterAndFont(usedCombinationsRef.current);
    const name = FONT_FAMILIES[pick.fontIdx]!;
    const box = estimateGlyphBox(pick.letter, name, FONT_SIZE_PX);
    const { top, left } = randomCropOffsets(
      box.gw,
      box.gh,
      viewportPx.w,
      viewportPx.h,
    );
    setCurrentLetter(pick.letter);
    setCurrentFontIndex(pick.fontIdx);
    setOffsetTop(top);
    setOffsetLeft(left);
    setInputValue("");
  }, [FONT_SIZE_PX, viewportPx.h, viewportPx.w]);

  useEffect(() => {
    let cancelled = false;
    FONT_STYLESHEETS.forEach((href, i) => {
      const id = `glyph-game-font-css-${href.slice(-20)}-${i}`;
      if (typeof document !== "undefined" && !document.getElementById(id)) {
        const l = document.createElement("link");
        l.rel = "stylesheet";
        l.href = href;
        l.id = id;
        document.head.appendChild(l);
      }
    });

    const done = () => {
      void document.fonts?.ready.then(() => {
        if (!cancelled) setFontsReady(true);
      });
    };
    done();

    const iv = window.setInterval(() => {
      if (
        FONT_FAMILIES.every(
          (name) => document.fonts?.check?.(`350px "${name}"`) ?? false,
        )
      ) {
        if (!cancelled) setFontsReady(true);
        window.clearInterval(iv);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearInterval(iv);
    };
  }, []);

  useLayoutEffect(() => {
    setLiveScoreGetter?.(() => finalRoundScore(rounds));
  }, [rounds, setLiveScoreGetter]);

  useEffect(() => {
    if (!isPlaying || !fontsReady) return;

    /* React 18 Strict Mode aynı mount’ta efekti iki kez çağırabilir — ikinci başlatmayı atlama */
    if (bootstrapRoundOnceRef.current) return;
    bootstrapRoundOnceRef.current = true;

    startFreshRound();
    // başlangıç round’ı: startFreshRound oyun sırasında sadece feedback sonrasında da çağrılır
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontsReady, isPlaying]);

  useEffect(() => {
    if (!isPlaying || !fontsReady || feedback !== null) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [
    currentLetter,
    currentFontIndex,
    feedback,
    fontsReady,
    isPlaying,
    offsetLeft,
    offsetTop,
  ]);

  useEffect(
    () => () => {
      if (feedbackTimerRef.current != null)
        window.clearTimeout(feedbackTimerRef.current);
    },
    [],
  );

  const correctCount = useMemo(
    () => rounds.reduce((acc, r) => acc + (r.correct ? 1 : 0), 0),
    [rounds],
  );
  const totalShown = rounds.length;

  const applyGuess = useCallback(() => {
    if (!isPlaying || !fontsReady || feedback !== null || submitBusyRef.current) return;

    const guess = sanitizeLetterInput(inputValue);
    if (guess == null) return;

    submitBusyRef.current = true;
    const ok = guess === currentLetter;

    setRounds((prev) => [...prev, { target: currentLetter, guess, correct: ok }]);
    setFeedback(ok ? "correct" : "wrong");

    if (feedbackTimerRef.current != null)
      window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedback(null);
      startFreshRound();
      submitBusyRef.current = false;
      feedbackTimerRef.current = null;
    }, 300);
  }, [
    currentLetter,
    feedback,
    fontsReady,
    inputValue,
    isPlaying,
    startFreshRound,
  ]);

  const onInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.slice(-1);
    if (v === "") {
      setInputValue("");
      return;
    }
    if (!/^[a-z]$/i.test(v)) return;
    setInputValue(v.toUpperCase());
  }, []);

  const onInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyGuess();
        return;
      }
      if (e.key.length === 1 && !/^[a-z]$/i.test(e.key) && !e.ctrlKey && !e.metaKey) {
        if (e.key !== " ") e.preventDefault();
      }
    },
    [applyGuess],
  );

  const viewBorderClass =
    feedback === "correct" ? "border-[#22C55E]" : feedback === "wrong" ? "border-[#EF4444]" : "border-black";

  if (!fontsReady) {
    return (
      <div className="flex flex-1 items-center justify-center py-16 text-sm text-foreground/60">
        Fontlar yükleniyor…
      </div>
    );
  }

  const inputDisabled = !isPlaying || feedback !== null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex justify-end text-sm tabular-nums text-foreground/70">
        {correctCount}/{totalShown}
      </div>

      <div className="flex flex-col items-center gap-3">
        <h2 className="text-center text-base font-semibold tracking-tight">Hangi harf?</h2>
        <div
          className={`relative mx-auto overflow-hidden rounded-none bg-white shadow-sm transition-colors duration-150 ease-out ${viewBorderClass} border-2`}
          style={{
            width: viewportPx.w,
            height: viewportPx.h,
          }}
          aria-live="polite"
        >
          <span
            className="absolute select-none leading-none"
            style={{
              fontFamily: fontStack,
              fontSize: FONT_SIZE_PX,
              fontWeight: 700,
              top: offsetTop,
              left: offsetLeft,
              color: "#000000",
              lineHeight: 1,
            }}
            aria-hidden
          >
            {currentLetter}
          </span>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-xs flex-col gap-2 px-3 sm:flex-row sm:gap-3">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          disabled={inputDisabled}
          maxLength={1}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="characters"
          onChange={onInputChange}
          className="w-full shrink rounded-lg border border-foreground/20 bg-background px-3 py-2.5 text-center text-xl font-semibold uppercase tracking-widest text-foreground outline-none ring-black/30 focus-visible:ring-2 disabled:cursor-not-allowed disabled:bg-foreground/[0.06] disabled:opacity-70"
          onKeyDown={onInputKeyDown}
          aria-label="Tahmin edeceğiniz harf"
        />
        <button
          type="button"
          disabled={inputDisabled}
          className="w-full shrink-0 rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          onClick={applyGuess}
        >
          Tahmin Et
        </button>
      </div>
      <p className="-mt-4 text-center text-xs text-foreground/50">Büyük harf girin</p>

    </div>
  );
}

export default function GlyphGuessPage() {
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
      duration={DURATION}
    >
      {(state) => (
        <GlyphGuessGameplay
          isPlaying={state.isPlaying}
          setLiveScoreGetter={state.setLiveScoreGetter}
        />
      )}
    </GameShell>
  );
}
