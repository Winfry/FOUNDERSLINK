export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="hidden flex-col justify-center bg-[#0454DB] p-10 text-white lg:flex lg:w-1/2">
        <p className="text-sm font-semibold uppercase tracking-wide text-white/80">FoundersLink</p>
        <h2 className="mt-4 text-3xl font-bold leading-tight">Admin dashboard</h2>
        <p className="mt-3 max-w-md text-white/90">
          Review verification, deal documents, and reports. Risk signals guide you — you decide.
        </p>
      </div>
      <div className="flex w-full flex-1 items-center justify-center bg-white p-4 sm:p-8 lg:w-1/2">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
