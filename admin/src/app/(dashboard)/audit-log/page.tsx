import { AuditLogTable } from "./audit-log-table";
import { PageHeader } from "@/components/page-header";

export default function AuditLogPage() {
  return (
    <div>
      <PageHeader title="Audit log" description="Immutable record of admin actions (mock)." />
      <AuditLogTable />
    </div>
  );
}
