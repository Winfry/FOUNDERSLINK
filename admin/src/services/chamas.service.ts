import type { ChamaDetail, ChamaListItem } from "@/types";
import { getChama, listChamas } from "./admin-mock-store";
import { delay } from "./pagination";

export async function fetchChamas(): Promise<ChamaListItem[]> {
  await delay();
  return listChamas();
}

export async function fetchChamaDetail(id: string): Promise<ChamaDetail | null> {
  await delay();
  return getChama(id);
}
