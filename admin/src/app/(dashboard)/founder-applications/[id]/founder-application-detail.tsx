"use client";

import { useRouter } from "next/navigation";
import { ApplicationReviewFooter } from "@/components/application-review-footer";
import { DocumentViewer } from "@/components/document-viewer";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FounderApplication } from "@/types";
import { formatDate, formatKes } from "@/lib/utils";
import {
  approveFounderApplication,
  rejectFounderApplication,
} from "@/services/founder-applications.service";

export function FounderApplicationDetail({ application }: { application: FounderApplication }) {
  const router = useRouter();
  const canReview = application.status !== "approved" && application.status !== "rejected";
  const p = application.payload;

  return (
    <div>
      <PageHeader title={application.businessName} description={application.applicantName} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-4 text-sm"><p className="text-muted">Email</p><p className="font-medium">{application.email}</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-sm"><p className="text-muted">County</p><p className="font-medium">{application.county}</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-sm"><p className="text-muted">Stage</p><p className="font-medium">{application.stage}</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-sm"><p className="text-muted">Status</p><StatusBadge status={application.status} /></CardContent></Card>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Business details</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><p className="text-muted">Sector</p><p className="font-medium">{application.sector}</p></div>
          <div><p className="text-muted">Funding target</p><p className="font-medium">{formatKes(application.fundingTargetKes)}</p></div>
          <div><p className="text-muted">Submitted</p><p className="font-medium">{formatDate(application.submittedAt)}</p></div>
          <div className="sm:col-span-2"><p className="text-muted">Description</p><p className="font-medium">{String(p.description ?? "—")}</p></div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader><CardTitle>Uploaded documents</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {application.documents.map((doc) => (
            <div key={doc.id} className="rounded-card border border-border p-3">
              <p className="text-sm font-medium">{doc.name}</p>
              <DocumentViewer fileName={doc.name} />
            </div>
          ))}
        </CardContent>
      </Card>

      <ApplicationReviewFooter
        canReview={canReview}
        onApprove={async () => {
          const cred = await approveFounderApplication(application.id);
          alert(`Approved (mock email).\nUser ID: ${cred.userId}\nTemp: ${cred.tempPassword}`);
          router.refresh();
        }}
        onReject={async (reason) => {
          await rejectFounderApplication(application.id, reason);
          router.refresh();
        }}
      />
    </div>
  );
}
