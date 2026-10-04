import { notFound } from "next/navigation";
import { VerificationDetailView } from "./verification-detail-view";
import { BackLink } from "@/components/back-link";
import { ListError } from "@/components/list-state";
import { fetchVerificationDetail } from "@/services/verification.service";

export default async function VerificationDetailPage({ params }: { params: { id: string } }) {
  let detail;
  try {
    detail = await fetchVerificationDetail(params.id);
  } catch {
    return (
      <div className="space-y-4">
        <BackLink href="/verification">Back to verification</BackLink>
        <ListError what="this application" />
      </div>
    );
  }
  if (!detail) notFound();
  return (
    <div className="space-y-4">
      <BackLink href="/verification">Back to verification</BackLink>
      <VerificationDetailView detail={detail} />
    </div>
  );
}
