import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKes(amount: number): string {
  // Written the way it is written in Kenya, and the same as the mobile app.
  return `KSh ${Math.round(amount).toLocaleString("en-KE")}`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}
