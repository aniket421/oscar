/**
 * TEST SUPPORT. Supabase clients for integration tests: the real `@supabase/supabase-js` client,
 * whose requests are answered by the emulator (real Postgres, real RLS) instead of the network.
 */
import { createClient } from "@supabase/supabase-js";

import type { ServerSupabaseClient } from "@/server/supabase/server-client";
import type { Database } from "@/server/supabase/database";

import { createTestDatabase, type TestDatabase } from "./database.mts";
import { createSupabaseEmulator, type SupabaseEmulator } from "./emulator.mts";

export const EMULATOR_URL = "http://supabase.test";
export const EMULATOR_KEY = "test-publishable-key-not-a-secret";
const TOKEN_PREFIX = "test-session:";

export interface TestBackend {
  database: TestDatabase;
  emulator: SupabaseEmulator;
  /** A client signed in as `userId` (requests carry that user's claims). */
  clientFor(userId: string): ServerSupabaseClient;
  /** A client with no session (the anon role). */
  anonymousClient(): ServerSupabaseClient;
  /** Creates an auth user and returns their id. */
  createUser(email: string): Promise<string>;
  close(): Promise<void>;
}

export async function createTestBackend(): Promise<TestBackend> {
  const database = await createTestDatabase();
  const emulator = createSupabaseEmulator(database, (token) => {
    if (!token || token === EMULATOR_KEY) return { role: "anon" };
    if (!token.startsWith(TOKEN_PREFIX)) return "invalid";
    return { role: "authenticated", sub: token.slice(TOKEN_PREFIX.length) };
  });

  const fetchThroughEmulator: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const response = await emulator.handle(request);
    return response ?? new Response("Not emulated", { status: 404 });
  };

  const client = (token: string | null): ServerSupabaseClient =>
    createClient<Database>(EMULATOR_URL, EMULATOR_KEY, {
      ...(token ? { accessToken: async () => token } : {}),
      global: { fetch: fetchThroughEmulator },
      auth: { persistSession: false, autoRefreshToken: false },
    });

  return {
    database,
    emulator,
    clientFor: (userId) => client(`${TOKEN_PREFIX}${userId}`),
    anonymousClient: () => client(null),
    async createUser(email) {
      const id = crypto.randomUUID();
      await database.createUser(id, email);
      return id;
    },
    close: () => database.close(),
  };
}
