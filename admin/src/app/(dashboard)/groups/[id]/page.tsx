import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatKes } from "@/lib/utils";
import { getGroup } from "@/services/groups.service";

export default async function GroupDetailPage({ params }: { params: { id: string } }) {
  const group = await getGroup(params.id);
  if (!group) notFound();

  const progress = Math.round((group.raisedKes / group.targetKes) * 100);

  return (
    <div>
      <PageHeader title={group.name} description={`Led by ${group.founderName}`} />
      <Card>
        <CardHeader>
          <CardTitle>Round details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted">County</p>
            <p className="font-medium">{group.county}</p>
          </div>
          <div>
            <p className="text-muted">Status</p>
            <StatusBadge status={group.status} />
          </div>
          <div>
            <p className="text-muted">Target</p>
            <p className="font-medium">{formatKes(group.targetKes)}</p>
          </div>
          <div>
            <p className="text-muted">Raised ({progress}%)</p>
            <p className="font-medium">{formatKes(group.raisedKes)}</p>
          </div>
          <div>
            <p className="text-muted">Members</p>
            <p className="font-medium">{group.memberCount}</p>
          </div>
          <div>
            <p className="text-muted">Created</p>
            <p className="font-medium">{formatDate(group.createdAt)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
