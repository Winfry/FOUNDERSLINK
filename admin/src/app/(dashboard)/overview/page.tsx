import { OverviewView } from "./overview-view";
import { fetchAdminStats } from "@/services/stats.service";

export default async function OverviewPage() {
  try {
    const stats = await fetchAdminStats();
    return <OverviewView stats={stats} />;
  } catch {
    return (
      <div className="rounded-card border border-destructive/30 bg-white p-8 text-center text-sm text-destructive">
        Could not load overview. Refresh to try again.
      </div>
    );
  }
}
