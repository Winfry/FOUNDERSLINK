"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Founder, TimelineEvent } from "@/types";
import { formatDate } from "@/lib/utils";
import { updateFounderStatus } from "@/services/founders.service";

export function FounderDetail({
  founder,
  timeline,
}: {
  founder: Founder;
  timeline: TimelineEvent[];
}) {
  const router = useRouter();
  const [confirmSuspend, setConfirmSuspend] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function suspend() {
    setLoading(true);
    await updateFounderStatus(founder.id, "suspended");
    setLoading(false);
    setConfirmSuspend(false);
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title={founder.name}
        description={founder.businessName}
        actions={
          founder.status !== "suspended" ? (
            <Button variant="destructive" onClick={() => setConfirmSuspend(true)}>
              Suspend account
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={async () => {
                await updateFounderStatus(founder.id, "active");
                router.refresh();
              }}
            >
              Reactivate
            </Button>
          )
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted">Email</p>
              <p className="font-medium">{founder.email}</p>
            </div>
            <div>
              <p className="text-muted">Phone</p>
              <p className="font-medium">{founder.phone}</p>
            </div>
            <div>
              <p className="text-muted">County</p>
              <p className="font-medium">{founder.county}</p>
            </div>
            <div>
              <p className="text-muted">Sector</p>
              <p className="font-medium">{founder.sector}</p>
            </div>
            <div>
              <p className="text-muted">Status</p>
              <StatusBadge status={founder.status} />
            </div>
            <div>
              <p className="text-muted">Joined</p>
              <p className="font-medium">{formatDate(founder.joinedAt)}</p>
            </div>
            <div>
              <p className="text-muted">Investment groups</p>
              <p className="font-medium">{founder.groupsCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Timeline events={timeline} />
          </CardContent>
        </Card>
      </div>
      <ConfirmDialog
        open={confirmSuspend}
        title="Suspend founder?"
        description="They will not be able to raise or withdraw until reactivated."
        confirmLabel="Suspend"
        variant="destructive"
        loading={loading}
        onConfirm={suspend}
        onCancel={() => setConfirmSuspend(false)}
      />
    </div>
  );
}
