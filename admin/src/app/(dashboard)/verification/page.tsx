import { VerificationView } from "./verification-view";
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
    if (result.data.length === 0 && result.total === 0) {
      // still render view for empty state inside table
    }
    return <VerificationView tab={tab} role={role} page={page} result={result} />;
  } catch {
    return (
      <div className="rounded-card border border-destructive/30 bg-white p-8 text-center text-sm text-destructive">
        Could not load the verification queue.
      </div>
    );
  }
}
