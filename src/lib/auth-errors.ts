import { PASSWORD_TOO_WEAK } from "./validation";

/** Maps Better Auth error codes to friendly copy. Client-safe. */
export function authErrorMessage(err: { code?: string; message?: string; status?: number } | null | undefined): string {
  switch (err?.code) {
    case "PASSWORD_TOO_SHORT":
      return PASSWORD_TOO_WEAK;
    case "PASSWORD_TOO_LONG":
      return "Password must be at most 128 characters.";
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_PASSWORD":
      return "That email and password don't match.";
    case "EMAIL_NOT_VERIFIED":
      return "Please confirm your email first. We've sent you a new link.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "An account with that email already exists. Try signing in.";
    case "INVALID_TOKEN":
      return "This link is invalid or has expired. Request a new one.";
  }
  if (err?.status === 429) return "Too many attempts. Please wait a few minutes and try again.";
  return err?.message || "Something went wrong. Please try again.";
}
