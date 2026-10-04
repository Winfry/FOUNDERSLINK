import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchChamaDetail } from "@/services/chamas.service";

export default async function ChamaDetailPage({ params }: { params: { id: string } }) {
  try {
    const chama = await fetchChamaDetail(params.id);
    if (!chama) notFound();
    return (
      <div className="space-y-6">
        <Link href="/chamas" className="text-sm text-[#1D4ED8] hover:underline">
          ← Back to chamas
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{chama.name}</h1>
          <p className="text-sm text-muted capitalize">
            {chama.type === "money" ? "Money chama" : "Learning circle"} · Organiser: {chama.organiserName}
          </p>
          <p className="mt-2 text-sm font-medium text-[#1E3A8A]">
            FounderLink records contributions. It never holds or moves money.
          </p>
        </div>
        <div className="rounded-card border border-border bg-white p-4">
          <h2 className="text-sm font-semibold">Members and roles</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {chama.members.map((m) => (
              <li key={m.memberId} className="flex justify-between border-b border-border pb-2">
                <span>{m.name}</span>
                <span className="capitalize text-muted">{m.role}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-card border border-border bg-[#EFF6FF] p-4 text-center">
            <p className="text-xs text-muted">Contributions recorded</p>
            <p className="text-2xl font-bold text-[#1D4ED8]">{chama.contributionCount}</p>
          </div>
          <div className="rounded-card border border-border bg-[#EFF6FF] p-4 text-center">
            <p className="text-xs text-muted">Goals tracked</p>
            <p className="text-2xl font-bold text-[#1D4ED8]">{chama.goalCount}</p>
          </div>
        </div>
      </div>
    );
  } catch {
    return (
      <div className="rounded-card border border-destructive/30 bg-white p-8 text-center text-sm text-destructive">
        Could not load chama.
      </div>
    );
  }
}
