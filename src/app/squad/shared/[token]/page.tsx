import { notFound } from "next/navigation";
import { getSharedSquad } from "@/lib/squad-share-store";
import { SharedSquadView } from "./shared-squad-view";

// ─── Page component ───────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ token: string }>;
}

export default async function SharedSquadPage({ params }: Props) {
  const { token } = await params;
  const entry = getSharedSquad(token);

  if (!entry) {
    notFound();
  }

  return <SharedSquadView squad={entry.squad} appName={entry.appName} />;
}
