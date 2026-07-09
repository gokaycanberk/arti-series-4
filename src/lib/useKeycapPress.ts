"use client";

import { useCallback, useEffect, useRef } from "react";

import { keycapLerp, KEYCAP_PRESS_LERP } from "@/lib/isoKeycap";

/** Tuş basma animasyonu + latch — DoneKeycap vb. */
export function useKeycapPress(options: {
  draw: (p: number) => void;
  onActivate?: () => void;
  holdAfterPress?: boolean;
  disabled?: boolean;
}) {
  const { draw, onActivate, holdAfterPress = true, disabled = false } = options;

  const disabledRef = useRef(disabled);
  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const progressRef = useRef(0);
  const targetRef = useRef(0);
  const latchedRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const startAnim = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const step = () => {
      progressRef.current = keycapLerp(
        progressRef.current,
        targetRef.current,
        KEYCAP_PRESS_LERP,
      );
      draw(progressRef.current);

      if (Math.abs(progressRef.current - targetRef.current) > 0.0005) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        progressRef.current = targetRef.current;
        draw(progressRef.current);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(step);
  }, [draw]);

  const press = useCallback(() => {
    if (disabledRef.current || latchedRef.current) return;
    targetRef.current = 1;
    startAnim();
  }, [startAnim]);

  const release = useCallback(() => {
    if (targetRef.current !== 1 || latchedRef.current) return;

    if (!disabledRef.current) {
      onActivate?.();
    }

    if (holdAfterPress) {
      latchedRef.current = true;
      targetRef.current = 1;
      progressRef.current = 1;
      draw(1);
      return;
    }

    targetRef.current = 0;
    startAnim();
  }, [draw, holdAfterPress, onActivate, startAnim]);

  const reset = useCallback(() => {
    latchedRef.current = false;
    targetRef.current = 0;
    progressRef.current = 0;
    draw(0);
  }, [draw]);

  const cancelAnim = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  return {
    progressRef,
    targetRef,
    latchedRef,
    press,
    release,
    reset,
    cancelAnim,
  };
}
