import { WithdrawalsTable } from "./withdrawals-table";
import { PageHeader } from "@/components/page-header";

export default function TransactionsReportPage() {
  return (
    <div>
      <PageHeader
        title="Transactions"
        description="Completed deposits and withdrawals across groups. Approvals happen on mobile."
      />
      <WithdrawalsTable />
    </div>
  );
}
