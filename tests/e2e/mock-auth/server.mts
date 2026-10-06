/**
 * TEST FIXTURE: a minimal in-memory stand-in for the Supabase Auth (GoTrue)
 * HTTP API, used only by the Playwright end-to-end suite. It lets the real
 * app code (@supabase/ssr, server actions, proxy) run against predictable
 * responses without a hosted project or real credentials.
 *
 * Never imported by application code. Run with: node tests/e2e/mock-auth/server.mts
 */
import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const port = Number(process.env.MOCK_AUTH_PORT ?? 54329);
/** When "true", signups must confirm their email (no session is returned). */
const requireConfirmation = process.env.MOCK_AUTH_REQUIRE_CONFIRMATION === "true";
/** Logging in with this address makes the mock answer 503, to test outage handling. */
const OUTAGE_EMAIL = "outage@example.test";

interface MockUser {
  id: string;
  email: string;
  password: string;
  name: string;
  createdAt: string;
}

interface MockSession {
  userId: string;
  expiresAt: number;
}

const users = new Map<string, MockUser>();
const sessions = new Map<string, MockSession>();
const refreshTokens = new Map<string, string>();

function base64url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function userJson(user: MockUser, identities = true) {
  return {
    id: user.id,
    aud: "authenticated",
    role: "authenticated",
    email: user.email,
    email_confirmed_at: user.createdAt,
    created_at: user.createdAt,
    updated_at: user.createdAt,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: user.name },
    identities: identities
      ? [{ id: user.id, user_id: user.id, provider: "email", identity_data: { email: user.email } }]
      : [],
  };
}

function issueSession(user: MockUser) {
  const expiresIn = 3600;
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      role: "authenticated",
      aud: "authenticated",
      exp: expiresAt,
      session_id: randomUUID(),
    }),
  );
  const accessToken = `${header}.${payload}.${base64url(randomUUID())}`;
  const refreshToken = randomUUID();
  sessions.set(accessToken, { userId: user.id, expiresAt });
  refreshTokens.set(refreshToken, user.id);
  return {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: expiresIn,
    expires_at: expiresAt,
    refresh_token: refreshToken,
    user: userJson(user),
  };
}

function send(res: ServerResponse, status: number, body?: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "X-Supabase-Api-Version": "2024-01-01",
  });
  res.end(body === undefined ? "" : JSON.stringify(body));
}

function fail(res: ServerResponse, status: number, code: string, message: string, extra = {}) {
  send(res, status, { code, message, ...extra });
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const text = Buffer.concat(chunks).toString("utf8");
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function bearer(req: IncomingMessage): string | undefined {
  const header = req.headers.authorization;
  return header?.startsWith("Bearer ") ? header.slice(7) : undefined;
}

function findUserById(id: string): MockUser | undefined {
  return [...users.values()].find((user) => user.id === id);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
  const path = url.pathname;

  if (req.method === "GET" && path === "/health") return send(res, 200, { ok: true });

  // Test controls.
  if (req.method === "POST" && path === "/__test/reset") {
    users.clear();
    sessions.clear();
    refreshTokens.clear();
    return send(res, 204);
  }
  if (req.method === "POST" && path === "/__test/expire-sessions") {
    sessions.clear();
    refreshTokens.clear();
    return send(res, 204);
  }
  if (req.method === "POST" && path === "/__test/users") {
    const body = await readJson(req);
    const user: MockUser = {
      id: randomUUID(),
      email: String(body.email).toLowerCase(),
      password: String(body.password),
      name: String(body.name ?? ""),
      createdAt: new Date().toISOString(),
    };
    users.set(user.email, user);
    return send(res, 201, { id: user.id });
  }

  if (req.method === "POST" && path === "/auth/v1/signup") {
    const body = await readJson(req);
    const email = String(body.email ?? "").toLowerCase();
    const password = String(body.password ?? "");
    const data = (body.data ?? {}) as { full_name?: string };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail(res, 400, "email_address_invalid", "Email address is invalid");
    }
    if (password.length < 8) {
      return fail(res, 422, "weak_password", "Password should be at least 8 characters.", {
        weak_password: { reasons: ["length"], message: "Password is too short" },
      });
    }
    const existing = users.get(email);
    if (existing) {
      // Mirrors Supabase: with confirmation on, existing users get an obfuscated user.
      return requireConfirmation
        ? send(res, 200, userJson({ ...existing, id: randomUUID() }, false))
        : fail(res, 422, "user_already_exists", "User already registered");
    }
    const user: MockUser = {
      id: randomUUID(),
      email,
      password,
      name: data.full_name ?? "",
      createdAt: new Date().toISOString(),
    };
    users.set(email, user);
    return requireConfirmation
      ? send(res, 200, userJson(user))
      : send(res, 200, issueSession(user));
  }

  if (req.method === "POST" && path === "/auth/v1/token") {
    const grant = url.searchParams.get("grant_type");
    const body = await readJson(req);
    if (grant === "password") {
      const email = String(body.email ?? "").toLowerCase();
      if (email === OUTAGE_EMAIL)
        return fail(res, 503, "unexpected_failure", "Service unavailable");
      const user = users.get(email);
      if (!user || user.password !== body.password) {
        return fail(res, 400, "invalid_credentials", "Invalid login credentials");
      }
      return send(res, 200, issueSession(user));
    }
    if (grant === "refresh_token") {
      const userId = refreshTokens.get(String(body.refresh_token ?? ""));
      const user = userId ? findUserById(userId) : undefined;
      if (!user) return fail(res, 400, "refresh_token_not_found", "Invalid Refresh Token");
      refreshTokens.delete(String(body.refresh_token));
      return send(res, 200, issueSession(user));
    }
    return fail(res, 400, "validation_failed", "Unsupported grant type");
  }

  if (req.method === "GET" && path === "/auth/v1/user") {
    const token = bearer(req);
    const session = token ? sessions.get(token) : undefined;
    const user = session ? findUserById(session.userId) : undefined;
    if (!session || !user || session.expiresAt * 1000 < Date.now()) {
      return fail(
        res,
        403,
        "session_not_found",
        "Session from session_id claim in JWT does not exist",
      );
    }
    return send(res, 200, userJson(user));
  }

  if (req.method === "POST" && path === "/auth/v1/logout") {
    const token = bearer(req);
    if (token) sessions.delete(token);
    return send(res, 204);
  }

  return fail(res, 404, "not_found", `No mock route for ${req.method} ${path}`);
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(
    `[mock-auth] listening on http://127.0.0.1:${port} (confirmation ${requireConfirmation ? "on" : "off"})\n`,
  );
});
