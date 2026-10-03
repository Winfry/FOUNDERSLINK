import { InvestorsTable } from "./investors-table";
import { PageHeader } from "@/components/page-header";

export default function InvestorsPage() {
  return (
    <div>
      <PageHeader title="Investors" description="Verified investors and angel networks on the platform." />
      <InvestorsTable />
    </div>
  );
}
