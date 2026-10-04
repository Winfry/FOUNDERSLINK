import Link from "next/link";
import type { ChamaListItem } from "@/types";

export function ChamasView({ chamas }: { chamas: ChamaListItem[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Chamas</h1>
        <p className="text-sm text-muted">Read-only list of money and learning circles.</p>
        <p className="mt-2 text-sm font-medium text-[#113373]">
          FoundersLink records contributions. It never holds or moves money.
        </p>
      </div>
      {chamas.length === 0 ? (
        <div className="rounded-card border border-border bg-white p-8 text-center text-sm text-muted">No chamas yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-[#EAF1FE]">
              <tr>
                <th className="px-4 py-3 font-semibold">Chama</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Members</th>
                <th className="px-4 py-3 font-semibold">Organiser</th>
                <th className="px-4 py-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {chamas.map((c) => (
                <tr key={c.id} className="border-b border-border hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/chamas/${c.id}`} className="font-medium text-[#0454DB] hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize">{c.type === "money" ? "Money" : "Learning"}</td>
                  <td className="px-4 py-3">{c.memberCount}</td>
                  <td className="px-4 py-3">{c.organiserName}</td>
                  <td className="px-4 py-3">{new Date(c.createdAt).toLocaleDateString("en-KE")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
