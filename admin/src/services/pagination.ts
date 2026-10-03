import type { PaginatedParams, PaginatedResult } from "@/types";

export function paginate<T>(
  items: T[],
  params: PaginatedParams = {},
  filterFn?: (item: T, search: string, status?: string) => boolean,
): PaginatedResult<T> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, params.pageSize ?? 10));
  const search = (params.search ?? "").trim().toLowerCase();
  const status = params.status;

  let filtered = items;
  if (filterFn && (search || status)) {
    filtered = items.filter((item) => filterFn(item, search, status));
  }

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const data = filtered.slice(start, start + pageSize);

  return { data, total, page, pageSize };
}

export function delay(ms = 120): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
