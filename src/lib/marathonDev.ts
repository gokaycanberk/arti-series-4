/** Geliştirme kısayolları — `.env.local` dosyasından okunur. */

export interface MarathonDevConfig {
  startGameIndex: number;
  /** true = renk seçimini atla, doğrudan startGameIndex oyununda başla */
  startAtGame: boolean;
  skipToResults: boolean;
  mockScore: number;
  /** Animasyonu belirli Figma sahnesinde dondur (örn. 2570, 1679, 2405, 2223) */
  freezeScene: number | null;
  /** true ise son kareye atla (animasyon yok) */
  instantResults: boolean;
}

export function getMarathonDevConfig(gameCount: number): MarathonDevConfig {
  const rawIndex = Number(process.env.NEXT_PUBLIC_MARATHON_START_INDEX ?? 0);
  const startGameIndex = Number.isFinite(rawIndex)
    ? Math.min(Math.max(0, Math.floor(rawIndex)), gameCount - 1)
    : 0;

  const startAtGame = process.env.NEXT_PUBLIC_MARATHON_START_AT_GAME === "1";

  const skipToResults =
    process.env.NEXT_PUBLIC_MARATHON_SKIP_TO_RESULTS === "1";

  const rawScore = Number(process.env.NEXT_PUBLIC_MARATHON_MOCK_SCORE ?? 3550);
  const mockScore = Number.isFinite(rawScore) ? rawScore : 3550;

  const rawScene = process.env.NEXT_PUBLIC_MARATHON_SCENE;
  const freezeScene =
    rawScene && rawScene.length > 0 && Number.isFinite(Number(rawScene))
      ? Number(rawScene)
      : null;

  const instantResults =
    process.env.NEXT_PUBLIC_MARATHON_INSTANT === "1";

  return {
    startGameIndex,
    startAtGame,
    skipToResults,
    mockScore,
    freezeScene,
    instantResults,
  };
}
