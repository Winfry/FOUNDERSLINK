import { FoundersTable } from "./founders-table";
import { PageHeader } from "@/components/page-header";

export default function FoundersPage() {
  return (
    <div>
      <PageHeader title="Founders" description="Registered founders and SMEs across Kenyan counties." />
      <FoundersTable />
    </div>
  );
}
