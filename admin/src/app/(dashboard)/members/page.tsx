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
      <div className="rounded-card border border-destructive/30 bg-white p-8 text-center text-sm text-destructive">
        Could not load members.
      </div>
    );
  }
}
