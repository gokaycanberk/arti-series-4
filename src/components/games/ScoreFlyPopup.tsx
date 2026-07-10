"use client";

import ScoreSideReveal from "./ScoreSideReveal";

interface ScoreFlyPopupProps {
  points: number;
  anchorRef: React.RefObject<HTMLElement | null>;
  onComplete?: () => void;
  targetId?: string;
  label?: string | null;
  flyToScore?: boolean;
  flyTargetLift?: number;
}

export default function ScoreFlyPopup({
  points,
  anchorRef,
  onComplete,
  targetId,
  label,
  flyToScore = true,
  flyTargetLift,
}: ScoreFlyPopupProps) {
  if (!flyToScore) return null;

  return (
    <ScoreSideReveal
      points={points}
      anchorRef={anchorRef}
      onComplete={onComplete}
      targetId={targetId}
      label={label}
      flyTargetLift={flyTargetLift}
    />
  );
}
