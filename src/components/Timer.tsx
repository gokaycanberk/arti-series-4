"use client";

/** Sağ üst veya blok içi saniye göstergesi. */
interface TimerProps {
  seconds: number;
  /** Ek sınıflar (ör. tipografi). */
  className?: string;
}

export function Timer({ seconds, className = "" }: TimerProps) {
  return (
    <span
      className={`tabular-nums text-sm font-medium tracking-tight text-foreground ${className}`}
      aria-live="polite"
    >
      {seconds}s
    </span>
  );
}
