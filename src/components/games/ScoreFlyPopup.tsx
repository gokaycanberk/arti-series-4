"use client";

import ScoreSideReveal from "./ScoreSideReveal";

interface ScoreFlyPopupProps {
  points: number;
  /** Etiket BAM / reveal sonu — scoreboard'a puan yazılır */
  onScoreLand?: () => void;
  /** Uçuş animasyonu bitti — cleanup */
  onComplete?: () => void;
  targetId?: string;
  label?: string | null;
  flyToScore?: boolean;
  flyTargetLift?: number;
}

/** Ortak skor popup — konum viewport merkezi (ScoreSideReveal) */
export default function ScoreFlyPopup({
  points,
  onScoreLand,
  onComplete,
  targetId,
  label,
  flyToScore = true,
  flyTargetLift = 100,
}: ScoreFlyPopupProps) {
  if (!flyToScore) return null;

  return (
    <ScoreSideReveal
      points={points}
      onScoreLand={onScoreLand}
      onComplete={onComplete}
      targetId={targetId}
      label={label}
      flyTargetLift={flyTargetLift}
    />
  );
}
