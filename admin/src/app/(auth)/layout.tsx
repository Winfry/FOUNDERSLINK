// An internal sign-in page, in the design's hero style: the purple
// gradient, the wordmark with its gold full stop, and a light headline.
// It says whose it is and nothing about what is behind it: anyone can land here.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <div className="relative flex items-center gap-3 overflow-hidden bg-[linear-gradient(118deg,#28184E_0%,#5634A5_60%,#765BB8_100%)] px-6 py-5 text-white lg:w-[44%] lg:flex-col lg:items-start lg:justify-between lg:p-14">
        <span aria-hidden className="pointer-events-none absolute -top-56 right-[10%] hidden h-[460px] w-[460px] rounded-full bg-accent/[0.12] lg:block" />
        <span className="relative text-xl font-semibold tracking-tight">
          FoundersLink<span className="text-accent">.</span>
        </span>
        <div className="relative hidden lg:block">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.12] px-3.5 py-1.5 text-[13px]">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            For FoundersLink staff only
          </span>
          <h2 className="mt-6 text-[52px] font-medium leading-[1.04] tracking-[-0.035em]">
            <span className="font-light text-[#D9CCF5]">Staff</span> sign-in
          </h2>
          <p className="mt-4 max-w-sm text-[17px] text-white/80">Check members, review documents and keep the network safe.</p>
        </div>
        <p className="relative hidden text-sm text-white/60 lg:block">Every decision is recorded with your written reason.</p>
      </div>
      <div className="flex w-full flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
