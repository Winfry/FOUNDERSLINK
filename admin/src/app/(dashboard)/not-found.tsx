import Link from "next/link";
import { EmptyState } from "@/components/empty-state";

export default function DashboardNotFound() {
  return (
    <EmptyState
      title="That record is not here"
      description="It may have been removed, or the link is out of date. Nothing is wrong with the dashboard."
      action={
        <Link
          href="/overview"
          className="inline-flex min-h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-white hover:bg-primary-dark"
        >
          Go to overview
        </Link>
      }
    />
  );
}
