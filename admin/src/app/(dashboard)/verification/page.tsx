import { VerificationView } from "./verification-view";
import { ListError } from "@/components/list-state";
import { PageHeader } from "@/components/page-header";
import { fetchVerificationQueue } from "@/services/verification.service";

export default async function VerificationPage({
  searchParams,
}: {
  searchParams: { tab?: string; page?: string; role?: string; search?: string };
}) {
  const tab = searchParams.tab ?? "waiting";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const role = searchParams.role ?? "all";
  try {
    const result = await fetchVerificationQueue(tab, {
      page,
      pageSize: 10,
      search: searchParams.search,
      status: role === "all" ? undefined : role,
    });
    return <VerificationView tab={tab} role={role} page={page} result={result} />;
  } catch {
    return (
      <div className="space-y-6">
        <PageHeader title="Verification" />
        <ListError what="the verification queue" />
      </div>
    );
  }
}
