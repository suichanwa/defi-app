import { z } from 'zod';
import { passwordStrength } from 'check-password-strength';

/**
 * Base password schema with strength validation
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine(
    (password) => {
      const strength = passwordStrength(password);
      // Require at least "Medium" strength (id: 1)
      return strength.id >= 1;
    },
    {
      message: 'Password is too weak. Use a mix of letters, numbers, and symbols',
    }
  );

/**
 * Validates a single password against the password schema
 */
export function validatePassword(password: string): string | null {
  const result = passwordSchema.safeParse(password);
  return result.success ? null : result.error.issues[0]?.message ?? 'Invalid password';
}

/**
 * Validates that two passwords match
 */
export function validatePasswordMatch(password: string, confirm: string): string | null {
  return password === confirm ? null : 'Passwords do not match';
}

/**
 * Creates a Zod schema for password matching with proper type inference
 * @param passwordFieldName - The key name for the password field (e.g., 'setupPassword')
 * @param confirmFieldName - The key name for the confirm field (e.g., 'setupConfirm')
 */
export function createPasswordMatchSchema<
  TPasswordKey extends string,
  TConfirmKey extends string
>(passwordFieldName: TPasswordKey, confirmFieldName: TConfirmKey) {
  return z
    .object({
      [passwordFieldName]: passwordSchema,
      [confirmFieldName]: z.string(),
    })
    .passthrough() // Allow additional fields
    .superRefine((data, ctx) => {
      const passwordValue = data[passwordFieldName as keyof typeof data] as string;
      const confirmValue = data[confirmFieldName as keyof typeof data] as string;

      if (passwordValue !== confirmValue) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Passwords do not match',
          path: [confirmFieldName],
        });
      }
    });
}

/**
 * Get password strength details
 */
export function getPasswordStrength(password: string) {
  return passwordStrength(password);
}

/**
 * Check if password meets minimum requirements
 */
export function meetsMinimumRequirements(password: string): boolean {
  return password.length >= 8;
}

/**
 * Check if password is strong enough (medium or better)
 */
export function isPasswordStrong(password: string): boolean {
  const strength = passwordStrength(password);
  return strength.id >= 1;
}