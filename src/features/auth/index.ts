// Public API of the auth feature. Server-only session helpers live in `src/server/auth`.
export { login, logout, signup, type LoginState, type SignupState } from "./actions";
export { AuthNoticeAlert } from "./components/auth-notice";
export { AuthPanel, AuthShell } from "./components/auth-shell";
export { AuthFormSkeleton } from "./components/form-skeleton";
export { LoginForm, type LoginFormProps } from "./components/login-form";
export { LogoutButton } from "./components/logout-button";
export { SignupForm } from "./components/signup-form";
export { describeAuthError, type AuthFailure } from "./errors";
export { parseNotice } from "./notices";
export {
  authRoutes,
  decideRouteAccess,
  loginUrl,
  safeRedirectPath,
  type AuthNotice,
} from "./routes";
export { validateLogin, validateSignup } from "./validation";
