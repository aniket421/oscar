-- Candidate profile: identity, career direction, education, experience, projects, certifications.
-- See docs/candidate-intelligence.md (sections 2 and 3) for the model and access rules.
--
-- Every table is owned by one auth user (user_id) and protected by Row Level Security.
-- Only the `authenticated` role can reach these tables, and only its own rows.

-- ---------------------------------------------------------------------------
-- Internal helpers (not exposed through the Data API)
-- ---------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- Keeps updated_at current on every update.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- True when every item is a non-blank string of at most max_length characters
-- and there are at most max_items items. Used by check constraints on text[] columns.
create or replace function private.text_items_valid(items text[], max_items integer, max_length integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select items is null or (
    cardinality(items) <= max_items
    and not exists (
      select 1
      from unnest(items) as item
      where item is null or char_length(btrim(item)) = 0 or char_length(item) > max_length
    )
  );
$$;

-- True for an optional text value that is either null or 1..max_length characters long.
create or replace function private.optional_text_valid(value text, max_length integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value is null or (char_length(btrim(value)) > 0 and char_length(value) <= max_length);
$$;

-- True when a date is null or the first day of a month (dates are stored at month precision).
create or replace function private.is_month_start(value date)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value is null or extract(day from value) = 1;
$$;

revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- profiles: identity and current career facts (1:1 with auth.users)
-- ---------------------------------------------------------------------------

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (private.optional_text_valid(full_name, 120)),
  headline text check (private.optional_text_valid(headline, 160)),
  location text check (private.optional_text_valid(location, 120)),
  avatar_path text check (
    avatar_path is null
    or avatar_path ~ ('^user/' || user_id::text || '/avatar/[0-9a-f-]{36}\.(png|jpg|webp)$')
  ),
  experience_level text check (experience_level in ('student', 'entry', 'mid', 'senior', 'lead')),
  years_of_experience smallint check (years_of_experience between 0 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Candidate identity and current career facts. Created on first save.';

-- ---------------------------------------------------------------------------
-- candidate_preferences: target role, industry, work type, goals (1:1)
-- ---------------------------------------------------------------------------

create table public.candidate_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  target_role text check (private.optional_text_valid(target_role, 120)),
  target_industry text check (private.optional_text_valid(target_industry, 120)),
  work_arrangements text[] not null default '{}' check (
    work_arrangements <@ array['remote', 'hybrid', 'onsite']::text[]
    and cardinality(work_arrangements) <= 3
  ),
  goal_position text check (private.optional_text_valid(goal_position, 120)),
  target_companies text[] not null default '{}'
    check (private.text_items_valid(target_companies, 20, 80)),
  areas_to_improve text[] not null default '{}'
    check (private.text_items_valid(areas_to_improve, 12, 120)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.candidate_preferences is 'Career direction and goals. Created on first save.';

-- ---------------------------------------------------------------------------
-- education, experience, projects, certifications (1:n)
-- ---------------------------------------------------------------------------

create table public.education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  institution text not null check (private.optional_text_valid(institution, 160)),
  degree text check (private.optional_text_valid(degree, 160)),
  field_of_study text check (private.optional_text_valid(field_of_study, 160)),
  start_date date check (private.is_month_start(start_date)),
  end_date date check (private.is_month_start(end_date)),
  grade text check (private.optional_text_valid(grade, 40)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint education_dates_ordered check (
    start_date is null or end_date is null or end_date >= start_date
  )
);

create index education_user_id_idx on public.education (user_id);

create table public.experience (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company text not null check (private.optional_text_valid(company, 160)),
  title text not null check (private.optional_text_valid(title, 160)),
  start_date date check (private.is_month_start(start_date)),
  end_date date check (private.is_month_start(end_date)),
  is_current boolean not null default false,
  responsibilities text check (private.optional_text_valid(responsibilities, 2000)),
  achievements text check (private.optional_text_valid(achievements, 2000)),
  technologies text[] not null default '{}' check (private.text_items_valid(technologies, 30, 60)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint experience_dates_ordered check (
    start_date is null or end_date is null or end_date >= start_date
  ),
  constraint experience_current_has_no_end check (not (is_current and end_date is not null))
);

create index experience_user_id_idx on public.experience (user_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (private.optional_text_valid(name, 160)),
  description text check (private.optional_text_valid(description, 2000)),
  role text check (private.optional_text_valid(role, 120)),
  technologies text[] not null default '{}' check (private.text_items_valid(technologies, 30, 60)),
  outcomes text check (private.optional_text_valid(outcomes, 2000)),
  url text check (url is null or (char_length(url) <= 2048 and url ~* '^https?://[^\s]+$')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_user_id_idx on public.projects (user_id);

create table public.certifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (private.optional_text_valid(name, 160)),
  issuer text check (private.optional_text_valid(issuer, 160)),
  issued_on date check (private.is_month_start(issued_on)),
  expires_on date check (private.is_month_start(expires_on)),
  credential_id text check (private.optional_text_valid(credential_id, 120)),
  credential_url text check (
    credential_url is null
    or (char_length(credential_url) <= 2048 and credential_url ~* '^https?://[^\s]+$')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint certifications_dates_ordered check (
    issued_on is null or expires_on is null or expires_on >= issued_on
  )
);

create index certifications_user_id_idx on public.certifications (user_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger candidate_preferences_set_updated_at before update on public.candidate_preferences
  for each row execute function private.set_updated_at();
create trigger education_set_updated_at before update on public.education
  for each row execute function private.set_updated_at();
create trigger experience_set_updated_at before update on public.experience
  for each row execute function private.set_updated_at();
create trigger projects_set_updated_at before update on public.projects
  for each row execute function private.set_updated_at();
create trigger certifications_set_updated_at before update on public.certifications
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Privileges and Row Level Security
-- ---------------------------------------------------------------------------

-- Anonymous requests get nothing; signed-in users get row access limited by the policies below.
revoke all on public.profiles, public.candidate_preferences, public.education,
  public.experience, public.projects, public.certifications from anon;
grant select, insert, update, delete on public.profiles, public.candidate_preferences,
  public.education, public.experience, public.projects, public.certifications to authenticated;

alter table public.profiles enable row level security;
alter table public.candidate_preferences enable row level security;
alter table public.education enable row level security;
alter table public.experience enable row level security;
alter table public.projects enable row level security;
alter table public.certifications enable row level security;

-- profiles
create policy profiles_select_own on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy profiles_delete_own on public.profiles
  for delete to authenticated using ((select auth.uid()) = user_id);

-- candidate_preferences
create policy candidate_preferences_select_own on public.candidate_preferences
  for select to authenticated using ((select auth.uid()) = user_id);
create policy candidate_preferences_insert_own on public.candidate_preferences
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy candidate_preferences_update_own on public.candidate_preferences
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy candidate_preferences_delete_own on public.candidate_preferences
  for delete to authenticated using ((select auth.uid()) = user_id);

-- education
create policy education_select_own on public.education
  for select to authenticated using ((select auth.uid()) = user_id);
create policy education_insert_own on public.education
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy education_update_own on public.education
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy education_delete_own on public.education
  for delete to authenticated using ((select auth.uid()) = user_id);

-- experience
create policy experience_select_own on public.experience
  for select to authenticated using ((select auth.uid()) = user_id);
create policy experience_insert_own on public.experience
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy experience_update_own on public.experience
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy experience_delete_own on public.experience
  for delete to authenticated using ((select auth.uid()) = user_id);

-- projects
create policy projects_select_own on public.projects
  for select to authenticated using ((select auth.uid()) = user_id);
create policy projects_insert_own on public.projects
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy projects_update_own on public.projects
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy projects_delete_own on public.projects
  for delete to authenticated using ((select auth.uid()) = user_id);

-- certifications
create policy certifications_select_own on public.certifications
  for select to authenticated using ((select auth.uid()) = user_id);
create policy certifications_insert_own on public.certifications
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy certifications_update_own on public.certifications
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy certifications_delete_own on public.certifications
  for delete to authenticated using ((select auth.uid()) = user_id);
