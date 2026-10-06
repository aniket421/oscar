-- Resumes, parse results, the analysis foundation, and skills.
-- See docs/candidate-intelligence.md (sections 2, 3, 6, and 9).

-- ---------------------------------------------------------------------------
-- resumes: uploaded files and their processing state
-- ---------------------------------------------------------------------------

create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text not null check (private.optional_text_valid(file_name, 255)),
  storage_path text not null unique,
  file_type text not null check (file_type in ('pdf', 'docx')),
  file_size integer not null check (file_size between 1 and 5242880),
  status text not null default 'uploaded'
    check (status in ('uploaded', 'processing', 'processed', 'failed')),
  processing_error text check (
    processing_error in ('unreadable', 'no_text', 'encrypted', 'too_many_pages', 'storage', 'internal')
  ),
  parsed_version smallint check (parsed_version > 0),
  uploaded_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A metadata row can only ever point at a file in its owner's folder.
  constraint resumes_storage_path_owned check (
    storage_path = 'user/' || user_id::text || '/resume/' || id::text || '/original.' || file_type
  ),
  -- An error code is present exactly when processing failed.
  constraint resumes_error_matches_status check ((status = 'failed') = (processing_error is not null)),
  constraint resumes_processed_has_version check (status <> 'processed' or parsed_version is not null)
);

create index resumes_user_id_created_at_idx on public.resumes (user_id, created_at desc);

comment on table public.resumes is 'Uploaded resume files. The newest row is the current resume.';
comment on column public.resumes.processing_error is 'An error code, never a message or file content.';

-- ---------------------------------------------------------------------------
-- resume_parses: what the parser found (1:1 with a processed resume)
-- The extracted text itself is never stored.
-- ---------------------------------------------------------------------------

create table public.resume_parses (
  resume_id uuid primary key references public.resumes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  parser_version smallint not null check (parser_version > 0),
  email text check (private.optional_text_valid(email, 254)),
  phone text check (private.optional_text_valid(phone, 40)),
  links text[] not null default '{}' check (private.text_items_valid(links, 10, 2048)),
  summary text check (private.optional_text_valid(summary, 1000)),
  detected_sections text[] not null default '{}' check (
    detected_sections <@ array[
      'summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'achievements'
    ]::text[]
  ),
  skill_names text[] not null default '{}' check (private.text_items_valid(skill_names, 100, 60)),
  word_count integer not null check (word_count >= 0),
  page_count integer check (page_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index resume_parses_user_id_idx on public.resume_parses (user_id);

comment on table public.resume_parses is 'Fields extracted from a resume. Never the full text.';

-- ---------------------------------------------------------------------------
-- resume_analyses: reserved for the future analysis worker (read-only for users)
-- Deliberately has no numeric score columns.
-- ---------------------------------------------------------------------------

create table public.resume_analyses (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  analyzer_version smallint not null check (analyzer_version > 0),
  target_role text check (private.optional_text_valid(target_role, 120)),
  strengths text[] not null default '{}' check (private.text_items_valid(strengths, 20, 500)),
  missing_skills text[] not null default '{}' check (private.text_items_valid(missing_skills, 50, 60)),
  experience_gaps text[] not null default '{}' check (private.text_items_valid(experience_gaps, 20, 500)),
  role_alignment text check (private.optional_text_valid(role_alignment, 2000)),
  quality_signals text[] not null default '{}' check (private.text_items_valid(quality_signals, 20, 500)),
  recommendations text[] not null default '{}' check (private.text_items_valid(recommendations, 20, 500)),
  created_at timestamptz not null default now()
);

create index resume_analyses_resume_id_idx on public.resume_analyses (resume_id, created_at desc);
create index resume_analyses_user_id_idx on public.resume_analyses (user_id);

comment on table public.resume_analyses is
  'Resume analysis results. Written only by a trusted worker (not built yet); owners can read.';

-- ---------------------------------------------------------------------------
-- skills: normalized, categorized, with provenance
-- ---------------------------------------------------------------------------

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (private.optional_text_valid(name, 60)),
  category text not null check (
    category in (
      'programming', 'frontend', 'backend', 'database', 'cloud', 'devops', 'ai_ml', 'tools',
      'soft_skills'
    )
  ),
  source text not null default 'user' check (source in ('user', 'resume')),
  -- The resume a skill was taken from; kept as provenance, cleared if that resume is deleted.
  resume_id uuid references public.resumes (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index skills_user_id_name_key on public.skills (user_id, lower(name));

comment on column public.skills.source is
  'user: entered by the candidate. resume: found in their resume and added by them.';

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create trigger resumes_set_updated_at before update on public.resumes
  for each row execute function private.set_updated_at();
create trigger resume_parses_set_updated_at before update on public.resume_parses
  for each row execute function private.set_updated_at();
create trigger skills_set_updated_at before update on public.skills
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Privileges and Row Level Security
-- ---------------------------------------------------------------------------

revoke all on public.resumes, public.resume_parses, public.resume_analyses, public.skills from anon;
grant select, insert, update, delete on public.resumes, public.resume_parses, public.skills
  to authenticated;
-- Analyses are written by a trusted worker only; signed-in users may read their own.
revoke all on public.resume_analyses from authenticated;
grant select on public.resume_analyses to authenticated;

alter table public.resumes enable row level security;
alter table public.resume_parses enable row level security;
alter table public.resume_analyses enable row level security;
alter table public.skills enable row level security;

-- True when the resume exists and belongs to the signed-in user. Foreign key checks bypass RLS,
-- so policies on tables that point at a resume use this to stop references to other users' files.
create or replace function private.owns_resume(target uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.resumes r where r.id = target and r.user_id = (select auth.uid())
  );
$$;

revoke all on function private.owns_resume(uuid) from public;
grant execute on function private.owns_resume(uuid) to authenticated, service_role;

-- resumes
create policy resumes_select_own on public.resumes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy resumes_insert_own on public.resumes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy resumes_update_own on public.resumes
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy resumes_delete_own on public.resumes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- resume_parses
create policy resume_parses_select_own on public.resume_parses
  for select to authenticated using ((select auth.uid()) = user_id);
create policy resume_parses_insert_own on public.resume_parses
  for insert to authenticated
  with check ((select auth.uid()) = user_id and private.owns_resume(resume_id));
create policy resume_parses_update_own on public.resume_parses
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and private.owns_resume(resume_id));
create policy resume_parses_delete_own on public.resume_parses
  for delete to authenticated using ((select auth.uid()) = user_id);

-- resume_analyses: read-only for owners
create policy resume_analyses_select_own on public.resume_analyses
  for select to authenticated using ((select auth.uid()) = user_id);

-- skills
create policy skills_select_own on public.skills
  for select to authenticated using ((select auth.uid()) = user_id);
create policy skills_insert_own on public.skills
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id and (resume_id is null or private.owns_resume(resume_id))
  );
create policy skills_update_own on public.skills
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id and (resume_id is null or private.owns_resume(resume_id))
  );
create policy skills_delete_own on public.skills
  for delete to authenticated using ((select auth.uid()) = user_id);
