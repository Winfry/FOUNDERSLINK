import Link from "next/link";
import { notFound } from "next/navigation";
import { MemberDetailView } from "./member-detail-view";
import { fetchMemberDetail } from "@/services/members.service";

export default async function MemberDetailPage({ params }: { params: { id: string } }) {
  try {
    const member = await fetchMemberDetail(params.id);
    if (!member) notFound();
    return (
      <div className="space-y-4">
        <Link href="/members" className="text-sm text-[#0454DB] hover:underline">
          ← Back to members
        </Link>
        <MemberDetailView member={member} />
      </div>
    );
  } catch {
    return (
      <div className="rounded-card border border-destructive/30 bg-white p-8 text-center text-sm text-destructive">
        Could not load member.
      </div>
    );
  }
}
