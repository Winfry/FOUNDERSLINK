import { redirect } from "next/navigation";

export default function Verify2FaRedirect({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const q = searchParams.next ? `?step=verify&next=${encodeURIComponent(searchParams.next)}` : "?step=verify";
  redirect(`/login${q}`);
}
