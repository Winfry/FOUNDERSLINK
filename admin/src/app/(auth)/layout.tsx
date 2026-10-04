import { ClipboardCheck, FileText, ShieldCheck } from "lucide-react";

const POINTS = [
  { icon: ShieldCheck, text: "Review verification applications and decide with a written reason." },
  { icon: ClipboardCheck, text: "Confirm or reject the documents shared in deals." },
  { icon: FileText, text: "Every decision is kept in the audit log." },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white lg:flex-row">
      <div className="flex items-center gap-3 bg-navy px-6 py-5 text-white lg:w-[44%] lg:flex-col lg:items-start lg:justify-between lg:p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-btn bg-white p-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="" className="h-full w-full object-contain" />
          </div>
          <span className="text-xl font-extrabold">FoundersLink admin</span>
        </div>
        <div className="hidden lg:block">
          <h2 className="max-w-md text-[40px] font-extrabold leading-[1.1]">Where trust decisions are made.</h2>
          <p className="mt-4 max-w-md text-base text-white/80">
            Risk signals guide the review. A person at FoundersLink makes every decision.
          </p>
          <ul className="mt-8 space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-base text-white/90">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="hidden text-sm font-medium text-white/60 lg:block">For FoundersLink staff only.</p>
      </div>
      <div className="flex w-full flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
