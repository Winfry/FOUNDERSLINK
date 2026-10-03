import { notFound } from "next/navigation";
import { FounderDetail } from "./founder-detail";
import { getFounder, getFounderTimeline } from "@/services/founders.service";

export default async function FounderDetailPage({ params }: { params: { id: string } }) {
  const founder = await getFounder(params.id);
  if (!founder) notFound();
  const timeline = await getFounderTimeline(params.id);
  return <FounderDetail founder={founder} timeline={timeline} />;
}
