import { ListError } from "@/components/list-state";
import { PageHeader } from "@/components/page-header";
import { MembersView } from "./members-view";
import { fetchMembers } from "@/services/members.service";
import type { MemberRole } from "@/types";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: { role?: string; page?: string; status?: string; search?: string };
}) {
  const role = (searchParams.role ?? "founder") as MemberRole;
  const page = Math.max(1, Number(searchParams.page) || 1);
  try {
    const result = await fetchMembers(role, {
      page,
      pageSize: 10,
      search: searchParams.search,
      status: searchParams.status,
    });
    return <MembersView role={role} page={page} result={result} />;
  } catch {
    return (
      <div className="space-y-6">
        <PageHeader title="Members" />
        <ListError what="the members list" />
      </div>
    );
  }
}
