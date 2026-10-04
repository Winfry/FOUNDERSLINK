"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthProgress } from "@/components/auth/auth-progress";
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

  useEffect(() => {
    if (stepParam === "verify") setStep("verify");
  }, [stepParam]);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "admin@founderlink.co.ke", password: "admin123" },
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
      <AuthProgress current={step === "login" ? "login" : "verify"} />
      {step === "login" ? (
        <>
          <h1 className="text-2xl font-bold text-foreground">Admin sign in</h1>
          <p className="mt-1 text-sm text-muted">FounderLink platform administration</p>
          <form className="mt-8 space-y-4" onSubmit={loginForm.handleSubmit(onLogin)}>
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              error={loginForm.formState.errors.email?.message}
              {...loginForm.register("email")}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              error={loginForm.formState.errors.password?.message}
              {...loginForm.register("password")}
            />
            {loginForm.formState.errors.root ? (
              <p className="text-sm text-destructive">{loginForm.formState.errors.root.message}</p>
            ) : null}
            <Button type="submit" className="w-full" loading={loginForm.formState.isSubmitting}>
              Continue
            </Button>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-foreground">Verification code</h1>
          <p className="mt-1 text-sm text-muted">Enter the 6-digit code from your authenticator app.</p>
          <form className="mt-8 space-y-4" onSubmit={verifyForm.handleSubmit(onVerify)}>
            <Input
              label="Verification code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              error={verifyForm.formState.errors.code?.message}
              {...verifyForm.register("code")}
            />
            {verifyForm.formState.errors.root ? (
              <p className="text-sm text-destructive">{verifyForm.formState.errors.root.message}</p>
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
