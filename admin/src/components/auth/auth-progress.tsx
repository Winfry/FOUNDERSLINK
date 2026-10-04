import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = "login" | "verify" | "dashboard";

const STEPS: { id: Step; label: string }[] = [
  { id: "login", label: "Sign in" },
  { id: "verify", label: "Code" },
  { id: "dashboard", label: "Dashboard" },
];

// Orange marks the step you are on; done steps are blue.
export function AuthProgress({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);

  return (
    <ol className="mb-8 flex items-center gap-3" aria-label="Sign-in steps">
      {STEPS.map((step, i) => {
        const done = i < currentIndex;
        const here = i === currentIndex;
        return (
          <li key={step.id} className="flex items-center gap-2" aria-current={here ? "step" : undefined}>
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                done && "bg-primary text-white",
                here && "bg-accent text-navy",
                !done && !here && "border border-border bg-white text-muted",
              )}
            >
              {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
            </span>
            <span className={cn("text-sm", here ? "font-bold text-foreground" : "font-semibold text-muted")}>{step.label}</span>
            {i < STEPS.length - 1 ? <span className="ml-1 h-px w-6 bg-border sm:w-10" aria-hidden /> : null}
          </li>
        );
      })}
    </ol>
  );
}
