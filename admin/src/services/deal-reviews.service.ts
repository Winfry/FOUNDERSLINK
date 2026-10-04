import type { DealReviewDetail, DealReviewListItem } from "@/types";
import {
  confirmDealDocument,
  getDealReview,
  listDealReviews,
  rejectDealDocument,
} from "./admin-mock-store";
import { delay } from "./pagination";
import { live } from "@/lib/api";
import * as http from "./deal-reviews.http";

export async function fetchDealReviews(): Promise<DealReviewListItem[]> {
  if (live) return http.fetchDealReviews();
  await delay();
  return listDealReviews();
}

export async function fetchDealReview(id: string): Promise<DealReviewDetail | null> {
  if (live) return http.fetchDealReview(id);
  await delay();
  return getDealReview(id);
}

export async function confirmDocument(dealId: string, documentId: string) {
  if (live) return http.confirmDocument(dealId, documentId);
  await delay();
  return confirmDealDocument(dealId, documentId);
}

export async function rejectDocument(dealId: string, documentId: string, reason: string) {
  if (live) return http.rejectDocument(dealId, documentId, reason);
  await delay();
  return rejectDealDocument(dealId, documentId, reason);
}
