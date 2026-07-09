"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

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

  useLayoutEffect(() => {
    if (!options.active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- kart kapanınca durumu sıfırla
      setPlayEnabled(false);
      setPlayPressed(false);
      return;
    }

    const card = cardRef.current;
    if (!card) return;

    setPlayEnabled(false);
    setPlayPressed(false);
    exitTlRef.current?.kill();
    const tl = runIntroCardEnter(card, () => setPlayEnabled(true));

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
