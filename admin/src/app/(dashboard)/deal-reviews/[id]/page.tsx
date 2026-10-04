import Link from "next/link";
import { notFound } from "next/navigation";
import { DealReviewDetailView } from "./deal-review-detail-view";
import { fetchDealReview } from "@/services/deal-reviews.service";

export default async function DealReviewDetailPage({ params }: { params: { id: string } }) {
  try {
    const deal = await fetchDealReview(params.id);
    if (!deal) notFound();
    return (
      <div className="space-y-4">
        <Link href="/deal-reviews" className="text-sm text-[#1D4ED8] hover:underline">
          ← Back to deal reviews
        </Link>
        <DealReviewDetailView deal={deal} />
      </div>
    );
  } catch {
    return (
      <div className="rounded-card border border-destructive/30 bg-white p-8 text-center text-sm text-destructive">
        Could not load deal review.
      </div>
    );
  }
}
