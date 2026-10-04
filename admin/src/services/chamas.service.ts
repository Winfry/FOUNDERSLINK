import type { ChamaDetail, ChamaListItem } from "@/types";
import { getChama, listChamas } from "./admin-mock-store";
import { delay } from "./pagination";
import { live } from "@/lib/api";

export async function fetchChamas(): Promise<ChamaListItem[]> {
  // The backend has no admin view of chamas yet. Showing the mock one
  // beside real numbers would be a made-up record, so the list is empty.
  if (live) return [];
  await delay();
  return listChamas();
}

export async function fetchChamaDetail(id: string): Promise<ChamaDetail | null> {
  if (live) return null;
  await delay();
  return getChama(id);
}
