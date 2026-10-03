import { z } from "zod";

// A Kenyan mobile number. Accepts 07..., 01..., 2547... or +2547..., and
// turns them all into one form, so the same number always compares equal.
export const kenyanMobile = z
  .string()
  .trim()
  .regex(/^(\+?254|0)[17]\d{8}$/, "Use a Kenyan mobile number")
  .transform((p) => `+254${p.slice(-9)}`);
