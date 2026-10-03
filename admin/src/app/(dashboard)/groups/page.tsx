import { GroupsTable } from "./groups-table";
import { PageHeader } from "@/components/page-header";

export default function GroupsPage() {
  return (
    <div>
      <PageHeader title="Investment groups" description="Founder-led rounds and member syndicates." />
      <GroupsTable />
    </div>
  );
}
