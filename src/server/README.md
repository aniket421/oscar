# server

Server-only adapters to external systems, behind narrow interfaces. Every module here imports
`server-only`, so it can never end up in a client bundle. Code here never imports from `features/`.

- `supabase/`: configuration, cookie policy, the request-scoped client, and proxy session refresh.
