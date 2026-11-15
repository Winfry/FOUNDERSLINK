import Link from "next/link";

// The way back to a list, in words: big enough to hit, always in the same place.
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="-ml-3 inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-primary hover:bg-primary-light">
      <span aria-hidden>←</span>
      {children}
    </Link>
  );
}
