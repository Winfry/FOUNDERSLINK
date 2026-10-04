import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { roleLabel } from "@/components/labels";
import { ListError } from "@/components/list-state";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchChamaDetail } from "@/services/chamas.service";

export default async function ChamaDetailPage({ params }: { params: { id: string } }) {
  let chama;
  try {
    chama = await fetchChamaDetail(params.id);
  } catch {
    return (
      <div className="space-y-4">
        <BackLink href="/chamas">Back to chamas</BackLink>
        <ListError what="this chama" />
      </div>
    );
  }
  if (!chama) notFound();
  return (
    <div className="space-y-6">
      <BackLink href="/chamas">Back to chamas</BackLink>
      <PageHeader
        title={chama.name}
        description={`${chama.type === "money" ? "Savings chama" : "Learning circle"} organised by ${chama.organiserName}. FoundersLink records contributions; it never holds or moves money.`}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-extrabold text-foreground">{chama.contributionCount}</p>
            <p className="text-sm text-muted">Contributions recorded</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-extrabold text-foreground">{chama.goalCount}</p>
            <p className="text-sm text-muted">Goals tracked</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          {chama.members.length === 0 ? (
            <p className="text-sm text-muted">Nobody has joined this chama yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {chama.members.map((m) => (
                <li key={m.memberId} className="flex justify-between gap-4 py-2.5 text-sm font-medium first:pt-0 last:pb-0">
                  <span>{m.name}</span>
                  <span className="text-muted">{roleLabel(m.role)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
