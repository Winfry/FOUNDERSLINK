import { ListError } from "@/components/list-state";
import { PageHeader } from "@/components/page-header";
import { AuditLogView } from "./audit-log-view";
import { fetchAuditLog } from "@/services/audit.service";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { page?: string; search?: string; actionType?: string; dateFrom?: string; dateTo?: string };
}) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  try {
    const result = await fetchAuditLog({
      page,
      pageSize: 10,
      search: searchParams.search,
      actionType: searchParams.actionType,
      dateFrom: searchParams.dateFrom,
      dateTo: searchParams.dateTo,
    });
    return <AuditLogView page={page} result={result} />;
  } catch {
    return (
      <div className="space-y-6">
        <PageHeader title="Audit log" />
        <ListError what="the audit log" />
      </div>
    );
  }
}
