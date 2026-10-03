"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const schema = z.object({
  platformName: z.string().min(1),
  supportEmail: z.string().email(),
  mpesaShortcode: z.string().min(5),
  maxWithdrawalKes: z.number().min(1000),
});

type FormValues = z.infer<typeof schema>;

export function SettingsForm() {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, isSubmitSuccessful },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      platformName: "FounderLink Kenya",
      supportEmail: "support@founderlink.co.ke",
      mpesaShortcode: "522522",
      maxWithdrawalKes: 500_000,
    },
  });

  function onSubmit() {
    return new Promise<void>((resolve) => setTimeout(resolve, 400));
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>General</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Input label="Platform name" {...register("platformName")} />
          <Input label="Support email" type="email" {...register("supportEmail")} />
          <Input label="M-Pesa paybill / shortcode" {...register("mpesaShortcode")} />
          <Input
            label="Max withdrawal (KES)"
            type="number"
            {...register("maxWithdrawalKes", { valueAsNumber: true })}
          />
          <Button type="submit" loading={isSubmitting}>
            Save settings
          </Button>
          {isSubmitSuccessful ? (
            <p className="text-sm text-success">Settings saved (mock).</p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
