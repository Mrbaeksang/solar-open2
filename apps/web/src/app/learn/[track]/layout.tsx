import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { AssistantPanel } from "@/components/assistant-panel";
import { ReadingContextProvider } from "@/components/reading-context-provider";
import { isLearningTrack } from "@/lib/content";

export default async function TrackLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ track: string }>;
}) {
  const { track } = await params;
  if (!isLearningTrack(track)) {
    notFound();
  }

  return (
    <ReadingContextProvider track={track}>
      {children}
      <AssistantPanel track={track} />
    </ReadingContextProvider>
  );
}
