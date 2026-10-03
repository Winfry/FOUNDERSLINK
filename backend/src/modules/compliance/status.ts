// compliance_status is the one place that says what a founder already
// has. Onboarding, the checklist and funder readiness all read it here.

import { prisma } from "../../shared/db.js";

// The items each founder has marked complete, keyed by her user id.
export async function completedItemIds(userIds: string[]): Promise<Map<string, string[]>> {
  const rows = await prisma.complianceStatus.findMany({
    where: { entity_type: "business", entity_id: { in: userIds }, status: "complete" },
    select: { entity_id: true, item_id: true },
  });
  const byUser = new Map<string, string[]>(userIds.map((id) => [id, []]));
  for (const row of rows) byUser.get(row.entity_id)!.push(row.item_id);
  return byUser;
}

export async function completedFor(userId: string): Promise<string[]> {
  return (await completedItemIds([userId])).get(userId)!;
}

// Progress on an item, for a business (entity_id = the founder's user
// id) or a deal (entity_id = the deal id).
export async function setEntityStatus(
  entityType: "business" | "deal",
  entityId: string,
  itemId: string,
  status: string,
  updatedBy: string,
  note?: string | null,
) {
  const key = { entity_type: entityType, entity_id: entityId, item_id: itemId };
  return prisma.complianceStatus.upsert({
    where: { entity_type_entity_id_item_id: key },
    create: { ...key, status, note: note ?? null, updated_by: updatedBy },
    update: { status, updated_by: updatedBy, ...(note !== undefined ? { note } : {}) },
  });
}

export function setStatus(userId: string, itemId: string, status: string, note?: string | null) {
  return setEntityStatus("business", userId, itemId, status, userId, note);
}
