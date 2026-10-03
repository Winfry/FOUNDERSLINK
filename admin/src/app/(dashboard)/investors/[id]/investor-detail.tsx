"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Investor } from "@/types";
import { formatDate, formatKes } from "@/lib/utils";
import { updateInvestorStatus } from "@/services/investors.service";

export function InvestorDetail({ investor }: { investor: Investor }) {
  const router = useRouter();

  return (
    <div>
      <PageHeader
        title={investor.name}
        description={investor.organization}
        actions={
          investor.status === "active" ? (
            <Button
              variant="destructive"
              onClick={async () => {
                await updateInvestorStatus(investor.id, "suspended");
                router.refresh();
              }}
            >
              Suspend
            </Button>
          ) : (
            <Button
              onClick={async () => {
                await updateInvestorStatus(investor.id, "active");
                router.refresh();
              }}
            >
              Activate
            </Button>
          )
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Investor profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted">Email</p>
            <p className="font-medium">{investor.email}</p>
          </div>
          <div>
            <p className="text-muted">Phone</p>
            <p className="font-medium">{investor.phone}</p>
          </div>
          <div>
            <p className="text-muted">County</p>
            <p className="font-medium">{investor.county}</p>
          </div>
          <div>
            <p className="text-muted">Status</p>
            <StatusBadge status={investor.status} />
          </div>
          <div>
            <p className="text-muted">Total invested</p>
            <p className="font-medium">{formatKes(investor.totalInvestedKes)}</p>
          </div>
          <div>
            <p className="text-muted">Active deals</p>
            <p className="font-medium">{investor.activeDeals}</p>
          </div>
          <div>
            <p className="text-muted">Verified</p>
            <p className="font-medium">{formatDate(investor.verifiedAt)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
