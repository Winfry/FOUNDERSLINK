import { cn } from "@/lib/utils";

type Step = "login" | "verify" | "dashboard";

const STEPS: { id: Step; label: string }[] = [
  { id: "login", label: "Sign in" },
  { id: "verify", label: "Verification" },
  { id: "dashboard", label: "Dashboard" },
];

export function AuthProgress({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between gap-2">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex flex-1 flex-col items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold",
                i <= currentIndex ? "bg-primary text-white" : "border border-border bg-white text-muted",
              )}
            >
              {i + 1}
            </div>
            <span className={cn("text-xs font-medium", i <= currentIndex ? "text-foreground" : "text-muted")}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
      <div className="relative mt-3 h-1 w-full rounded-full bg-border">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${(currentIndex / (STEPS.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}
