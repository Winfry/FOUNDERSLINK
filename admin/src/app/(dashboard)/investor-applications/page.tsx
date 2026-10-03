import { ApplicationsTable } from "./applications-table";
import { PageHeader } from "@/components/page-header";

export default function InvestorApplicationsPage() {
  return (
    <div>
      <PageHeader
        title="Investor applications"
        description="Review and approve investor onboarding requests."
      />
      <ApplicationsTable />
    </div>
  );
}
