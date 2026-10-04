import { ReportsView } from "./reports-view";
import { fetchReports } from "@/services/reports.service";

export default async function ReportsPage() {
  try {
    const data = await fetchReports();
    return <ReportsView messages={data.messages} members={data.members} />;
  } catch {
    return (
      <div className="rounded-card border border-destructive/30 bg-white p-8 text-center text-sm text-destructive">
        Could not load reports.
      </div>
    );
  }
}
