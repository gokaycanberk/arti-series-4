"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { runIntroCardEnter, runIntroCardExit } from "@/lib/gameIntro";

/** Intro kartı + PLAY! — tüm oyunlarda paylaşılan akış */
export function useGameIntroPlay(options: {
  active: boolean;
  onDismiss: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [playEnabled, setPlayEnabled] = useState(false);
  const [playPressed, setPlayPressed] = useState(false);
  const exitTlRef = useRef<ReturnType<typeof runIntroCardExit> | null>(null);
  const onDismissRef = useRef(options.onDismiss);
  useEffect(() => {
    onDismissRef.current = options.onDismiss;
  });

  useEffect(() => {
    if (!options.active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- kart kapanınca durumu sıfırla
      setPlayEnabled(false);
      setPlayPressed(false);
      return;
    }

    setPlayEnabled(false);
    setPlayPressed(false);
    const tl = runIntroCardEnter(cardRef.current, () => setPlayEnabled(true));

    return () => {
      tl.kill();
      exitTlRef.current?.kill();
    };
  }, [options.active]);

  const handlePlay = useCallback(() => {
    if (!playEnabled || playPressed) return;

    setPlayPressed(true);
    exitTlRef.current?.kill();
    exitTlRef.current = runIntroCardExit(cardRef.current, () => {
      onDismissRef.current();
    });
  }, [playEnabled, playPressed]);

  return { cardRef, playEnabled, playPressed, handlePlay };
}
