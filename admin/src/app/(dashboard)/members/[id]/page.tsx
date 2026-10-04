import { notFound } from "next/navigation";
import { MemberDetailView } from "./member-detail-view";
import { BackLink } from "@/components/back-link";
import { ListError } from "@/components/list-state";
import { fetchMemberDetail } from "@/services/members.service";

export default async function MemberDetailPage({ params }: { params: { id: string } }) {
  let member;
  try {
    member = await fetchMemberDetail(params.id);
  } catch {
    return (
      <div className="space-y-4">
        <BackLink href="/members">Back to members</BackLink>
        <ListError what="this member" />
      </div>
    );
  }
  if (!member) notFound();
  return (
    <div className="space-y-4">
      <BackLink href="/members">Back to members</BackLink>
      <MemberDetailView member={member} />
    </div>
  );
}
