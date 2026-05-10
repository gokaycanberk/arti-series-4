"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseTimerOptions {
  /** Süre bittiğinde bir kez çağrılır. */
  onFinish?: () => void;
}

/**
 * Geri sayım sayacı — belirli saniye ile başlatılır, her saniye `timeLeft` güncellenir.
 */
export function useTimer(options: UseTimerOptions = {}) {
  const { onFinish } = options;
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const onFinishRef = useRef(onFinish);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const startTimer = useCallback(
    (duration: number) => {
      clearTick();
      const safe = Math.max(0, Math.floor(duration));
      setIsFinished(false);
      setTimeLeft(safe);
      setIsRunning(true);

      if (safe === 0) {
        setIsRunning(false);
        setIsFinished(true);
        onFinishRef.current?.();
        return;
      }

      tickRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearTick();
            setIsRunning(false);
            setIsFinished(true);
            queueMicrotask(() => onFinishRef.current?.());
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [clearTick],
  );

  const stopTimer = useCallback(() => {
    clearTick();
    setIsRunning(false);
  }, [clearTick]);

  const resetTimer = useCallback(() => {
    clearTick();
    setTimeLeft(0);
    setIsRunning(false);
    setIsFinished(false);
  }, [clearTick]);

  useEffect(() => () => clearTick(), [clearTick]);

  return {
    startTimer,
    stopTimer,
    resetTimer,
    timeLeft,
    isRunning,
    isFinished,
  };
}
