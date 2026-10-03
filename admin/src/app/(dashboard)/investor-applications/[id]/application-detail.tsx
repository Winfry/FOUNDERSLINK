"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { ApplicationReviewFooter } from "@/components/application-review-footer";
import { DocumentViewer } from "@/components/document-viewer";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InvestorApplication, TimelineEvent } from "@/types";
import { formatDate, formatKes } from "@/lib/utils";
import {
  approveInvestorApplication,
  rejectInvestorApplication,
} from "@/services/investor-applications.service";

export function ApplicationDetail({
  application,
  timeline,
}: {
  application: InvestorApplication;
  timeline: TimelineEvent[];
}) {
  const router = useRouter();
  const canReview = application.status !== "approved" && application.status !== "rejected";
  const p = application.payload;

  return (
    <div>
      <PageHeader title={application.applicantName} description={application.organization} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-4 text-sm"><p className="text-muted">Email</p><p className="font-medium">{application.email}</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-sm"><p className="text-muted">Phone</p><p className="font-medium">{application.phone}</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-sm"><p className="text-muted">Status</p><StatusBadge status={application.status} /></CardContent></Card>
        <Card><CardContent className="pt-4 text-sm"><p className="text-muted">Submitted</p><p className="font-medium">{formatDate(application.submittedAt)}</p></CardContent></Card>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Application answers</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><p className="text-muted">Applicant type</p><p className="font-medium">{String(p.applicantType ?? "—")}</p></div>
          <div><p className="text-muted">County</p><p className="font-medium">{application.county}</p></div>
          <div><p className="text-muted">Ticket size</p><p className="font-medium">{formatKes(application.ticketSizeKes)}</p></div>
          <div><p className="text-muted">Source of funds</p><p className="font-medium">{String(p.sourceOfFunds ?? "—")}</p></div>
          <div className="sm:col-span-2"><p className="text-muted">Track record / notes</p><p className="font-medium">{String(p.trackRecord ?? p.sourceExplain ?? "—")}</p></div>
          {Object.entries(p)
            .filter(([k]) => !["applicantType", "county", "ticketSizeKes", "ticket", "sourceOfFunds", "trackRecord", "sourceExplain", "organization", "documents", "email", "fullName", "phone"].includes(k))
            .map(([key, val]) => (
              <div key={key}><p className="text-muted">{key}</p><p className="font-medium">{String(val)}</p></div>
            ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Uploaded documents</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {application.documents.length === 0 ? (
              <p className="text-sm text-muted">No documents attached.</p>
            ) : (
              application.documents.map((doc) => (
                <div key={doc.id} className="rounded-card border border-border p-3">
                  <p className="text-sm font-medium">{doc.name}</p>
                  <p className="text-xs text-muted">{doc.mimeType ?? "file"}</p>
                  <DocumentViewer fileName={doc.name} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Review timeline</CardTitle></CardHeader>
          <CardContent><Timeline events={timeline} /></CardContent>
        </Card>
      </div>

      {application.rejectionReason ? (
        <p className="mt-4 text-sm text-destructive">Rejection reason: {application.rejectionReason}</p>
      ) : null}

      <ApplicationReviewFooter
        canReview={canReview}
        approvePreview="Email will include User ID and temporary password. Applicant must set a new password on first login."
        onApprove={async () => {
          const cred = await approveInvestorApplication(application.id);
          alert(`Approved (mock email sent).\nUser ID: ${cred.userId}\nTemp password: ${cred.tempPassword}`);
          router.refresh();
        }}
        onReject={async (reason) => {
          await rejectInvestorApplication(application.id, reason);
          router.refresh();
        }}
      />
    </div>
  );
}
