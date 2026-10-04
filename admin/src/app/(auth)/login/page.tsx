"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password is required"),
});

const verifySchema = z.object({
  code: z.string().length(6, "Enter the 6-digit code"),
});

type LoginForm = z.infer<typeof loginSchema>;
type VerifyForm = z.infer<typeof verifySchema>;

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-muted">Loading…</div>}>
      <LoginFlow />
    </Suspense>
  );
}

function LoginFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const stepParam = searchParams.get("step");
  const [step, setStep] = useState<"login" | "verify">("login");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (stepParam === "verify") setStep("verify");
  }, [stepParam]);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const verifyForm = useForm<VerifyForm>({
    resolver: zodResolver(verifySchema),
    defaultValues: { code: "" },
  });

  async function onLogin(values: LoginForm) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      loginForm.setError("root", { message: "Invalid email or password" });
      return;
    }
    const data = (await res.json()) as { twoFactorRequired?: boolean };
    if (data.twoFactorRequired) {
      setStep("verify");
      router.replace(next ? `/login?step=verify&next=${encodeURIComponent(next)}` : "/login?step=verify");
      return;
    }
    router.push(next && next.startsWith("/") ? next : "/overview");
    router.refresh();
  }

  async function onVerify(values: VerifyForm) {
    const res = await fetch("/api/auth/verify-2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      verifyForm.setError("root", { message: "Invalid verification code" });
      return;
    }
    router.push(next && next.startsWith("/") ? next : "/overview");
    router.refresh();
  }

  return (
    <div>
      {step === "login" ? (
        <>
          <h1 className="text-2xl font-extrabold text-foreground">Sign in</h1>
          <p className="mt-1 text-base text-muted">Use your staff email and password.</p>
          <form className="mt-8 space-y-5" noValidate onSubmit={loginForm.handleSubmit(onLogin)}>
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              error={loginForm.formState.errors.email?.message}
              {...loginForm.register("email")}
            />
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  className="min-h-9 rounded-[10px] px-3 text-sm font-bold text-primary hover:bg-primary-light"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              }
              error={loginForm.formState.errors.password?.message}
              {...loginForm.register("password")}
            />
            {loginForm.formState.errors.root ? (
              <p role="alert" className="rounded-btn border border-destructive/30 bg-destructive-light px-4 py-3 text-sm font-semibold text-destructive">
                That email and password do not match an admin account. Check both and try again.
              </p>
            ) : null}
            <Button type="submit" className="w-full" loading={loginForm.formState.isSubmitting}>
              Sign in
            </Button>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-extrabold text-foreground">Enter your sign-in code</h1>
          <p className="mt-1 text-base text-muted">Enter the 6-digit code from your authenticator app.</p>
          <form className="mt-8 space-y-5" noValidate onSubmit={verifyForm.handleSubmit(onVerify)}>
            <Input
              label="6-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              error={verifyForm.formState.errors.code?.message}
              {...verifyForm.register("code")}
            />
            {verifyForm.formState.errors.root ? (
              <p role="alert" className="rounded-btn border border-destructive/30 bg-destructive-light px-4 py-3 text-sm font-semibold text-destructive">
                That code was not accepted. Codes change every 30 seconds: enter the newest one.
              </p>
            ) : null}
            <Button type="submit" className="w-full" loading={verifyForm.formState.isSubmitting}>
              Verify and continue
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("login")}>
              Back to sign in
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
