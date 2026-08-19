import { ConvexError } from "convex/values";

import { env, type QueryCtx } from "./_generated/server";

type AuthContext = Pick<QueryCtx, "auth">;

/**
 * Require a JWT that Convex has validated against the configured Clerk
 * instance. Call this before reading or writing any application data.
 */
export async function requireAuthenticatedUser(ctx: AuthContext) {
  const identity = await ctx.auth.getUserIdentity();

  if (identity === null) {
    throw new ConvexError("Unauthenticated");
  }

  // Generated env types refresh after the required variables are first set.
  // Keep this cast local so a fresh checkout still typechecks before setup.
  const { ALLOWED_USER_EMAILS } = env as unknown as {
    readonly ALLOWED_USER_EMAILS?: string;
  };

  if (!ALLOWED_USER_EMAILS) {
    throw new ConvexError("Authorization is not configured");
  }

  const allowedEmails = ALLOWED_USER_EMAILS
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const email = identity.email?.toLowerCase();

  if (!email || !allowedEmails.includes(email)) {
    throw new ConvexError("Forbidden");
  }

  return identity;
}
