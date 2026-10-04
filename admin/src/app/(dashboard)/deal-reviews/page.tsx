import { DealReviewsView } from "./deal-reviews-view";
import { fetchDealReviews } from "@/services/deal-reviews.service";

export default async function DealReviewsPage() {
  try {
    const deals = await fetchDealReviews();
    return <DealReviewsView deals={deals} />;
  } catch {
    return (
      <div className="rounded-card border border-destructive/30 bg-white p-8 text-center text-sm text-destructive">
        Could not load deal reviews.
      </div>
    );
  }
}
