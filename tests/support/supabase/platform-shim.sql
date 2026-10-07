-- TEST SHIM. Not a migration and never applied to a real project.
--
-- The minimal subset of the Supabase platform that Oscar's migrations rely on, so the real
-- migration files can be applied to a plain Postgres (PGlite in tests). It reproduces:
--   * the API roles (anon, authenticated, service_role) and Supabase's permissive default grants
--     on the public schema, which is exactly why RLS matters;
--   * auth.users and auth.uid(), which reads the JWT claims PostgREST sets per request;
--   * storage.buckets, storage.objects (with RLS enabled), storage.foldername(), and the trigger
--     that refuses direct deletes unless the request opted in, as the Storage API does.

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

-- auth ----------------------------------------------------------------------

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;

create table auth.users (
  id uuid primary key,
  email text,
  created_at timestamptz not null default now()
);

create function auth.uid() returns uuid
language sql stable
as $$
  select nullif(
    coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    ),
    ''
  )::uuid;
$$;

create function auth.role() returns text
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
  );
$$;

-- public: Supabase grants every API role full privileges on new objects by default.

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

-- storage -------------------------------------------------------------------

create schema storage;
grant usage on schema storage to anon, authenticated, service_role;

create table storage.buckets (
  id text primary key,
  name text not null unique,
  owner uuid,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  owner_id text,
  metadata jsonb,
  path_tokens text[] generated always as (string_to_array(name, '/')) stored,
  version text,
  user_metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_accessed_at timestamptz default now(),
  unique (bucket_id, name)
);

alter table storage.buckets enable row level security;
alter table storage.objects enable row level security;
grant all on storage.buckets, storage.objects to anon, authenticated, service_role;

create function storage.foldername(name text) returns text[]
language plpgsql immutable
as $$
declare
  _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1:array_length(_parts, 1) - 1];
end;
$$;

-- Supabase Storage refuses direct DELETEs on storage.objects unless the request opted in, which the
-- Storage API does on every request (storage.allow_delete_query = 'true'); the delete policies
-- then decide. Same function and statement trigger as a real project's protect_objects_delete.
create function storage.protect_delete() returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('storage.allow_delete_query', true), 'false') != 'true' then
    raise exception 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
      using hint = 'This prevents accidental data loss from orphaned objects.', errcode = '42501';
  end if;
  return null;
end;
$$;

create trigger protect_objects_delete before delete on storage.objects
  for each statement execute function storage.protect_delete();
