import { notFound } from "next/navigation";
import { FounderApplicationDetail } from "./founder-application-detail";
import { getFounderApplication } from "@/services/founder-applications.service";

export default async function FounderApplicationPage({ params }: { params: { id: string } }) {
  const application = await getFounderApplication(params.id);
  if (!application) notFound();
  return <FounderApplicationDetail application={application} />;
}
