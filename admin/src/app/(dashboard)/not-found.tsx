import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function DashboardNotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="That record is not here"
      description="It may have been removed, or the link is out of date. Nothing is wrong with the dashboard."
      action={
        <Link
          href="/overview"
          className="inline-flex min-h-10 items-center rounded-btn bg-primary px-4 text-sm font-bold text-white hover:bg-primary-dark"
        >
          Go to overview
        </Link>
      }
    />
  );
}
