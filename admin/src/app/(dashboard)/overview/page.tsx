import { ListError } from "@/components/list-state";
import { PageHeader } from "@/components/page-header";
import { OverviewView } from "./overview-view";
import { fetchAdminStats } from "@/services/stats.service";

export default async function OverviewPage() {
  try {
    const stats = await fetchAdminStats();
    return <OverviewView stats={stats} />;
  } catch {
    return (
      <div className="space-y-6">
        <PageHeader title="Overview" />
        <ListError what="the overview numbers" />
      </div>
    );
  }
}
