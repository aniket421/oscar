/** Liveness probe used for local verification and future deployment checks. */
export function GET(): Response {
  return Response.json({ status: "ok" });
}
