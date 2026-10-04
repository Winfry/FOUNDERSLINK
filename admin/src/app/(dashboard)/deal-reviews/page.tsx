import { DealReviewsView } from "./deal-reviews-view";
import { ListError } from "@/components/list-state";
import { PageHeader } from "@/components/page-header";
import { fetchDealReviews } from "@/services/deal-reviews.service";

export default async function DealReviewsPage() {
  try {
    const deals = await fetchDealReviews();
    return <DealReviewsView deals={deals} />;
  } catch {
    return (
      <div className="space-y-6">
        <PageHeader title="Deal reviews" />
        <ListError what="the deals waiting for review" />
      </div>
    );
  }
}
