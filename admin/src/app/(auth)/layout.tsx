import { AuthCarousel } from "@/components/auth/auth-carousel";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col lg:flex-row">
      {/* Desktop: left half carousel */}
      <div className="hidden lg:block lg:w-1/2 lg:shrink-0">
        <AuthCarousel className="min-h-screen" />
      </div>
      {/* Mobile: carousel as background */}
      <div className="pointer-events-none absolute inset-0 lg:hidden">
        <AuthCarousel className="min-h-screen opacity-90" />
        <div className="absolute inset-0 bg-white/85 backdrop-blur-[2px]" />
      </div>
      {/* Form: right half (desktop) / on top (mobile) */}
      <div className="relative z-10 flex w-full flex-1 items-center justify-center p-4 sm:p-8 lg:w-1/2 lg:bg-white">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
