import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { UserX } from "lucide-react";

export default function FounderNotFound() {
  return (
    <EmptyState
      icon={UserX}
      title="Founder not found"
      description="This founder ID does not exist in the mock registry."
      action={
        <Link href="/founders">
          <Button variant="secondary">Back to founders</Button>
        </Link>
      }
    />
  );
}
