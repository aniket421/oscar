# server

Server-only adapters to external systems, behind narrow interfaces. Every module here imports
`server-only`, so it can never end up in a client bundle. Code here never imports from `features/`.

- `supabase/`: configuration, cookie policy, the request-scoped client (typed by `database.ts`,
  which mirrors `supabase/migrations/`), proxy session refresh, and request-scoped sign-out.
- `candidate/`: repositories for the candidate profile, resumes, parse results, and analyses;
  private file storage (resumes, profile photos); and `DataAccessError`, which reduces provider
  errors to a kind and a code that are safe to log. Every call runs with the signed-in user's
  session, so Row Level Security applies; no service-role key is used.
