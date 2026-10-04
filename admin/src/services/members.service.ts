import type { MemberDetail, MemberListItem, MemberRole, PaginatedParams, PaginatedResult } from "@/types";
import { getMemberDetail, listMembers, reinstateMember, suspendMember } from "./admin-mock-store";
import { delay, paginate } from "./pagination";
import { live } from "@/lib/api";
import * as http from "./members.http";

export async function fetchMembers(
  role: MemberRole,
  params: PaginatedParams = {},
): Promise<PaginatedResult<MemberListItem>> {
  if (live) return http.fetchMembers(role, params);
  await delay();
  const items = listMembers(role);
  return paginate(items, params, (item, search, status) => {
    if (status && status !== "all") {
      if (status === "suspended" || status === "active") {
        if (item.memberStatus !== status) return false;
      } else if (item.approvalStatus !== status) {
        return false;
      }
    }
    if (!search) return true;
    return `${item.fullName} ${item.email} ${item.organisationOrBusiness ?? ""}`.toLowerCase().includes(search);
  });
}

export async function fetchMemberDetail(id: string): Promise<MemberDetail | null> {
  if (live) return http.fetchMemberDetail(id);
  await delay();
  return getMemberDetail(id);
}

export async function suspendMemberAction(id: string, reason: string) {
  if (live) return http.suspendMember(id, reason);
  await delay();
  return suspendMember(id, reason);
}

export async function reinstateMemberAction(id: string, reason: string) {
  if (live) return http.reinstateMember(id, reason);
  await delay();
  return reinstateMember(id, reason);
}

/** CSV export for current role list (unpaginated). */
export async function exportMembersCsv(role: MemberRole): Promise<string> {
  if (live) return http.exportMembersCsv(role);
  await delay(80);
  const rows = listMembers(role);
  const header = "Name,Organisation,Status,Joined,Verification status\n";
  const body = rows
    .map(
      (r) =>
        `"${r.fullName}","${r.organisationOrBusiness ?? ""}","${r.memberStatus}","${r.joinedAt}","${r.approvalStatus}"`,
    )
    .join("\n");
  return header + body;
}
