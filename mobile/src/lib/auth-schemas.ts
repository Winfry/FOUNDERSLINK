import { z } from 'zod';
import { emailSchema, passwordSchema } from './validation';

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z
  .object({
    fullName: z.string().min(2, 'Enter your full name'),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.enum(['founder', 'investor', 'expert']),
    acceptTerms: z.boolean().refine((v) => v === true, {
      message: 'You must accept the Terms and Privacy Policy',
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const otpSchema = z.object({
  otp: z.string().length(6, 'Enter the 6-digit code'),
});

export const resetPasswordSchema = z
  .object({
    email: emailSchema,
    code: z.string().length(6, 'Enter the 6-digit code'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const forgotEmailSchema = z.object({
  email: emailSchema,
});
