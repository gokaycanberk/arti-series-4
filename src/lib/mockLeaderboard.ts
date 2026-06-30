export interface LeaderboardEntry {
  rank: number;
  hex: string;
  score: number;
  /** Avatar sütunu arka plan rengi */
  accent: string;
}

/** Figma Desktop-114 — sabit top 10 (oyuncu kartı ayrı gösterilir). */
export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, hex: "#F7BEA0", score: 9_834_567, accent: "#F7BEA0" },
  { rank: 2, hex: "#86B4A3", score: 8_734_242, accent: "#86B4A3" },
  { rank: 3, hex: "#D04F82", score: 7_762_367, accent: "#D04F82" },
  { rank: 4, hex: "#F74F0D", score: 6_534_563, accent: "#F74F0D" },
  { rank: 5, hex: "#7E39DC", score: 5_434_512, accent: "#7E39DC" },
  { rank: 6, hex: "#81E45C", score: 4_678_914, accent: "#81E45C" },
  { rank: 7, hex: "#A70561", score: 3_467_860, accent: "#A70561" },
  { rank: 8, hex: "#FFF460", score: 2_945_402, accent: "#FFF460" },
  { rank: 9, hex: "#18BFF0", score: 1_303_940, accent: "#AAB6FF" },
  { rank: 10, hex: "#401D93", score: 1_001_673, accent: "#401D93" },
];

export function buildLeaderboard(): LeaderboardEntry[] {
  return MOCK_LEADERBOARD;
}
