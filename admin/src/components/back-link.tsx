import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// The way back to a list: big enough to hit, always in the same place.
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="-ml-3 inline-flex min-h-10 items-center gap-2 rounded-btn px-3 text-sm font-bold text-primary hover:bg-primary-light"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {children}
    </Link>
  );
}
