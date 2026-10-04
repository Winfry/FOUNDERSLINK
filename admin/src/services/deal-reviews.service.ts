import type { DealReviewDetail, DealReviewListItem } from "@/types";
import {
  confirmDealDocument,
  getDealReview,
  listDealReviews,
  rejectDealDocument,
} from "./admin-mock-store";
import { delay } from "./pagination";

export async function fetchDealReviews(): Promise<DealReviewListItem[]> {
  await delay();
  return listDealReviews();
}

export async function fetchDealReview(id: string): Promise<DealReviewDetail | null> {
  await delay();
  return getDealReview(id);
}

export async function confirmDocument(dealId: string, documentId: string) {
  await delay();
  return confirmDealDocument(dealId, documentId);
}

export async function rejectDocument(dealId: string, documentId: string, reason: string) {
  await delay();
  return rejectDealDocument(dealId, documentId, reason);
}
