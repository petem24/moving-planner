import { defineApp } from "convex/server";
import { v } from "convex/values";

export default defineApp({
  env: {
    ALLOWED_USER_EMAILS: v.string(),
    CLERK_JWT_ISSUER_DOMAIN: v.string(),
  },
});
