import { ReportsView } from "./reports-view";
import { PageHeader } from "@/components/page-header";

export default function ReportsPage() {
  return (
    <div>
      <PageHeader title="Reports" description="Export-ready summaries for compliance and leadership." />
      <ReportsView />
    </div>
  );
}
