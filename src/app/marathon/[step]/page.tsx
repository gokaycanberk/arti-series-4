import { notFound } from "next/navigation";

import { TOTAL_GAMES } from "@/lib/games";

import { MarathonStepClient } from "./MarathonStepClient";

interface MarathonStepPageProps {
  params: Promise<{ step: string }>;
}

export default async function MarathonStepPage({ params }: MarathonStepPageProps) {
  const { step } = await params;
  const numeric = Number.parseInt(step, 10);

  if (!Number.isFinite(numeric) || numeric < 1 || numeric > TOTAL_GAMES) {
    notFound();
  }

  return <MarathonStepClient step={numeric} />;
}
