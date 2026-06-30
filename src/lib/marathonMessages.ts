export interface MarathonResultMessage {
  top: string;
  bottom: string;
}

/** Maraton toplam skoruna göre çember mesajı (5 oyun × 1000 max ≈ 5000). */
export function getMarathonResultMessage(
  totalScore: number,
): MarathonResultMessage {
  const ratio = totalScore / 5000;

  if (ratio >= 0.8) {
    return { top: "YOU ARE A DESIGN FREAK", bottom: "WE LOVE IT" };
  }
  if (ratio >= 0.6) {
    return { top: "SOLID EYE", bottom: "NICE WORK" };
  }
  if (ratio >= 0.4) {
    return { top: "GETTING THERE", bottom: "KEEP PUSHING" };
  }
  if (ratio >= 0.2) {
    return { top: "ROUGH ROUND", bottom: "TRY AGAIN" };
  }
  return { top: "CREATIVE BLOCK?", bottom: "YOU GOT THIS" };
}
