import { notFound } from "next/navigation";
import { ApplicationDetail } from "./application-detail";
import { getApplicationTimeline, getInvestorApplication } from "@/services/investor-applications.service";

export default async function ApplicationDetailPage({ params }: { params: { id: string } }) {
  const application = await getInvestorApplication(params.id);
  if (!application) notFound();
  const timeline = await getApplicationTimeline(params.id);
  return <ApplicationDetail application={application} timeline={timeline} />;
}
