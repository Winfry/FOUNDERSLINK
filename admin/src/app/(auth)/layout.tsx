// An internal sign-in page. It says whose it is and nothing about what
// is behind it: anyone can land here.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white lg:flex-row">
      <div className="flex items-center gap-3 bg-navy px-6 py-5 text-white lg:w-[44%] lg:flex-col lg:items-start lg:justify-between lg:p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-btn bg-white p-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="" className="h-full w-full object-contain" />
          </div>
          <span className="text-xl font-extrabold">FoundersLink</span>
        </div>
        <h2 className="hidden text-[40px] font-extrabold leading-[1.1] lg:block">Staff sign-in</h2>
        <p className="hidden text-sm font-medium text-white/60 lg:block">For FoundersLink staff only.</p>
      </div>
      <div className="flex w-full flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
