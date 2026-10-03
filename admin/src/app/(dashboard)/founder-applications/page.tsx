import { FounderApplicationsTable } from "./founder-applications-table";
import { PageHeader } from "@/components/page-header";

export default function FounderApplicationsPage() {
  return (
    <div>
      <PageHeader title="Founder applications" description="Review founder join requests before issuing login credentials." />
      <FounderApplicationsTable />
    </div>
  );
}
