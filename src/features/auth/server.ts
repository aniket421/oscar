import "server-only";

// Server-only entry point of the auth feature (session Data Access Layer).
// Import from "@/features/auth/server" in Server Components, Actions, and Route Handlers.
export { getCurrentUser, requireUser, toAuthUser, type AuthUser } from "./session";
