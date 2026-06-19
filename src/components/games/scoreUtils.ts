const MAX_DISTANCE = 150;

export function scoreFromDistance(distance: number): number {
  const d = Math.min(Math.abs(distance), MAX_DISTANCE);
  return Math.round(1000 * (1 - d / MAX_DISTANCE));
}

export function getScoreLabel(points: number): string | null {
  if (points === 0) return "NOPE!";
  if (points >= 900) return "SMOOTH!";
  if (points >= 700) return "NICE!";
  if (points >= 500) return "OK!";
  return null;
}
