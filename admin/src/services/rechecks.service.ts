import type { RecheckListItem } from "@/types";
import { listRechecks } from "./admin-mock-store";
import { delay } from "./pagination";

export async function fetchRechecks(): Promise<RecheckListItem[]> {
  await delay();
  return listRechecks();
}
