import { z } from 'zod';

export const phoneKenyaSchema = z
  .string()
  .regex(/^\+254[17]\d{8}$/, 'Enter a valid Kenyan number (+2547... or +2541...)');

export const emailSchema = z.string().email('Enter a valid email address');

export const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[0-9]/, 'Include a number');

export function passwordStrength(password: string): {
  score: number;
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const labels: Array<'Weak' | 'Fair' | 'Good' | 'Strong'> = ['Weak', 'Fair', 'Good', 'Strong'];
  return { score: Math.min(score, 4), label: labels[Math.min(Math.floor(score / 1.5), 3)] };
}
