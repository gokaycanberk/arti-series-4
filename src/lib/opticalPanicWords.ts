/** Optical Panic — kelime + düşen harf varyasyonları */

export interface OpticalPanicRound {
  word: string;
  missingIndex: number;
}

export interface OpticalPanicWordDef {
  word: string;
  /** Yukarıdan inecek harf adayları — her turda random biri seçilir */
  fallingChars: readonly string[];
}

/** Maraton / test sırası: MIND → HEART → FLAIR */
export const OPTICAL_PANIC_WORD_SEQUENCE = [
  {
    word: "MIND",
    fallingChars: ["I", "N"],
  },
  {
    word: "HEART",
    fallingChars: ["E", "A"],
  },
  {
    word: "FLAIR",
    fallingChars: ["L", "A"],
  },
] as const satisfies readonly OpticalPanicWordDef[];

export interface PickOpticalPanicRoundOptions {
  /** Test / maraton: 0=MIND, 1=HEART, 2=FLAIR */
  sequenceIndex?: number;
}

function pickFrom<T extends readonly string[]>(pool: T): T[number] {
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? pool[0]!;
}

function resolveMissingIndex(word: string, char: string): number {
  const index = word.indexOf(char);
  if (index === -1) {
    throw new Error(`Optical Panic: "${char}" not found in "${word}"`);
  }
  return index;
}

function pickFallingIndex(wordDef: OpticalPanicWordDef): number {
  const char = pickFrom(wordDef.fallingChars);
  return resolveMissingIndex(wordDef.word, char);
}

function pickWordDef(): OpticalPanicWordDef {
  const index = Math.floor(Math.random() * OPTICAL_PANIC_WORD_SEQUENCE.length);
  return OPTICAL_PANIC_WORD_SEQUENCE[index] ?? OPTICAL_PANIC_WORD_SEQUENCE[0]!;
}

export function pickOpticalPanicRound(
  options?: PickOpticalPanicRoundOptions,
): OpticalPanicRound {
  const wordDef =
    options?.sequenceIndex !== undefined
      ? OPTICAL_PANIC_WORD_SEQUENCE[
          options.sequenceIndex % OPTICAL_PANIC_WORD_SEQUENCE.length
        ]!
      : pickWordDef();

  return {
    word: wordDef.word,
    missingIndex: pickFallingIndex(wordDef),
  };
}
