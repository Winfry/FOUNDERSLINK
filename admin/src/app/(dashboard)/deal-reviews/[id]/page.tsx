import { notFound } from "next/navigation";
import { DealReviewDetailView } from "./deal-review-detail-view";
import { BackLink } from "@/components/back-link";
import { ListError } from "@/components/list-state";
import { fetchDealReview } from "@/services/deal-reviews.service";

export default async function DealReviewDetailPage({ params }: { params: { id: string } }) {
  let deal;
  try {
    deal = await fetchDealReview(params.id);
  } catch {
    return (
      <div className="space-y-4">
        <BackLink href="/deal-reviews">Back to deal reviews</BackLink>
        <ListError what="this deal" />
      </div>
    );
  }
  if (!deal) notFound();
  return (
    <div className="space-y-4">
      <BackLink href="/deal-reviews">Back to deal reviews</BackLink>
      <DealReviewDetailView deal={deal} />
    </div>
  );
}
