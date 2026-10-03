import { AdminUsersTable } from "./admin-users-table";
import { PageHeader } from "@/components/page-header";

export default function AdminUsersPage() {
  return (
    <div>
      <PageHeader title="Admin users" description="Platform staff accounts and roles." />
      <AdminUsersTable />
    </div>
  );
}
