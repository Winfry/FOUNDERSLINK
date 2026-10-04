import { ListError } from "@/components/list-state";
import { PageHeader } from "@/components/page-header";
import { ReportsView } from "./reports-view";
import { fetchReports } from "@/services/reports.service";

export default async function ReportsPage() {
  try {
    const data = await fetchReports();
    return <ReportsView messages={data.messages} members={data.members} />;
  } catch {
    return (
      <div className="space-y-6">
        <PageHeader title="Reports" />
        <ListError what="the reports" />
      </div>
    );
  }
}
