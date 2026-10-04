import Link from "next/link";
import { notFound } from "next/navigation";
import { VerificationDetailView } from "./verification-detail-view";
import { fetchVerificationDetail } from "@/services/verification.service";

export default async function VerificationDetailPage({ params }: { params: { id: string } }) {
  try {
    const detail = await fetchVerificationDetail(params.id);
    if (!detail) notFound();
    return (
      <div className="space-y-4">
        <Link href="/verification" className="text-sm text-[#0454DB] hover:underline">
          ← Back to verification
        </Link>
        <VerificationDetailView detail={detail} />
      </div>
    );
  } catch {
    return (
      <div className="rounded-card border border-destructive/30 bg-white p-8 text-center text-sm text-destructive">
        Could not load verification detail.
      </div>
    );
  }
}
