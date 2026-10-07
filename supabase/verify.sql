-- Read-only check that Oscar's migrations are applied to a Supabase project with Row Level
-- Security and private storage intact. Paste it into the SQL editor and run it: every row should
-- show ok = true, and any failure is listed first. It is a single SELECT over the system catalogs
-- and changes nothing. tests/db/verify-sql.test.ts keeps it in step with supabase/migrations/.
with
expected_tables(name, privileges) as (
  values
    ('profiles', 'SELECT,INSERT,UPDATE,DELETE'),
    ('candidate_preferences', 'SELECT,INSERT,UPDATE,DELETE'),
    ('education', 'SELECT,INSERT,UPDATE,DELETE'),
    ('experience', 'SELECT,INSERT,UPDATE,DELETE'),
    ('projects', 'SELECT,INSERT,UPDATE,DELETE'),
    ('certifications', 'SELECT,INSERT,UPDATE,DELETE'),
    ('skills', 'SELECT,INSERT,UPDATE,DELETE'),
    ('resumes', 'SELECT,INSERT,UPDATE,DELETE'),
    ('resume_parses', 'SELECT,INSERT,UPDATE,DELETE'),
    -- Analyses are written by a trusted worker only; signed-in users may read their own.
    ('resume_analyses', 'SELECT')
),
commands(cmd) as (
  values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')
),
expected_policies(schemaname, tablename, policyname, cmd, bucket) as (
  select 'public', t.name, t.name || '_' || lower(c.cmd) || '_own', c.cmd, null
  from expected_tables t
  join commands c on position(c.cmd in t.privileges) > 0
  union all
  select 'storage', 'objects', b.prefix || '_objects_' || lower(c.cmd) || '_own', c.cmd, b.bucket
  from (values ('resume', 'resumes'), ('avatar', 'avatars')) as b(prefix, bucket)
  cross join commands c
),
expected_buckets(id, size_limit, mime_types) as (
  values
    (
      'resumes',
      5242880::bigint,
      array[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]::text[]
    ),
    ('avatars', 2097152::bigint, array['image/png', 'image/jpeg', 'image/webp']::text[])
),
checks(area, item, ok, detail) as (
  -- Every table exists with Row Level Security enabled.
  select
    'rls',
    'public.' || t.name,
    coalesce(c.relrowsecurity, false),
    case
      when c.oid is null then 'table missing'
      when not c.relrowsecurity then 'RLS disabled'
      else 'RLS enabled'
    end
  from expected_tables t
  left join pg_class c on c.oid = to_regclass('public.' || t.name)

  union all
  select
    'rls',
    'storage.objects',
    coalesce(c.relrowsecurity, false),
    case
      when c.oid is null then 'table missing'
      when not c.relrowsecurity then 'RLS disabled'
      else 'RLS enabled'
    end
  from (select to_regclass('storage.objects') as oid) s
  left join pg_class c on c.oid = s.oid

  -- Every policy exists for the right command and role, and checks ownership with auth.uid()
  -- (an update policy in both USING and WITH CHECK, so a row cannot be handed to another user).
  union all
  select
    'policy',
    e.schemaname || '.' || e.tablename || ': ' || e.policyname,
    coalesce(
      p.permissive = 'PERMISSIVE'
        and p.cmd = e.cmd
        and p.roles = array['authenticated']::name[]
        and (e.cmd = 'INSERT' or p.qual like '%auth.uid()%')
        and (e.cmd in ('SELECT', 'DELETE') or p.with_check like '%auth.uid()%')
        and (
          e.bucket is null
          or concat_ws(' ', p.qual, p.with_check) like '%''' || e.bucket || '''%'
        ),
      false
    ),
    case
      when p.policyname is null then 'policy missing'
      else p.cmd || ' to ' || array_to_string(p.roles, ', ')
    end
  from expected_policies e
  left join pg_policies p
    on p.schemaname = e.schemaname and p.tablename = e.tablename and p.policyname = e.policyname

  -- No other policy on these tables: an extra permissive policy would widen access.
  union all
  select
    'policy',
    'no other policies on Oscar tables',
    count(p.policyname) = 0,
    coalesce('review: ' || string_agg(p.tablename || '.' || p.policyname, ', '), 'none')
  from pg_policies p
  where p.schemaname = 'public'
    and p.tablename in (select name from expected_tables)
    and not exists (
      select 1 from expected_policies e
      where e.schemaname = p.schemaname and e.tablename = p.tablename and e.policyname = p.policyname
    )

  union all
  select
    'policy',
    'no other policies on storage.objects',
    count(p.policyname) = 0,
    coalesce('review: ' || string_agg(p.policyname, ', '), 'none')
  from pg_policies p
  where p.schemaname = 'storage'
    and p.tablename = 'objects'
    and not exists (
      select 1 from expected_policies e
      where e.schemaname = p.schemaname and e.tablename = p.tablename and e.policyname = p.policyname
    )

  -- Anonymous requests get nothing; signed-in users get exactly the expected privileges. (With a
  -- list, has_table_privilege is true when any one is held, so expected ones are checked singly.)
  union all
  select
    'privilege',
    'public.' || t.name,
    case
      when to_regclass('public.' || t.name) is null then false
      else not has_table_privilege('anon', 'public.' || t.name, 'SELECT,INSERT,UPDATE,DELETE')
        and not exists (
          select 1 from commands c
          where (position(c.cmd in t.privileges) > 0)
            <> has_table_privilege('authenticated', 'public.' || t.name, c.cmd)
        )
    end,
    'anon: none; authenticated: ' || t.privileges
  from expected_tables t

  union all
  select
    'privilege',
    'schema private',
    coalesce(not has_schema_privilege('anon', n.oid, 'USAGE'), false),
    case when n.oid is null then 'schema missing' else 'anon: no usage' end
  from (select to_regnamespace('private') as oid) n

  -- Buckets exist, are private, and keep their size and type limits.
  union all
  select
    'storage',
    'bucket ' || e.id,
    coalesce(
      not b.public
        and b.file_size_limit = e.size_limit
        and b.allowed_mime_types @> e.mime_types
        and e.mime_types @> b.allowed_mime_types,
      false
    ),
    case
      when b.id is null then 'bucket missing'
      when b.public then 'PUBLIC bucket'
      else 'private, ' || b.file_size_limit || ' bytes, '
        || array_to_string(b.allowed_mime_types, ', ')
    end
  from expected_buckets e
  left join storage.buckets b on b.id = e.id

  -- Helper functions, triggers, and the case-insensitive skill name index.
  union all
  select 'schema', 'function ' || f.signature, to_regprocedure(f.signature) is not null,
    case when to_regprocedure(f.signature) is null then 'missing' else 'present' end
  from (
    values
      ('private.set_updated_at()'),
      ('private.text_items_valid(text[], integer, integer)'),
      ('private.optional_text_valid(text, integer)'),
      ('private.is_month_start(date)'),
      ('private.owns_resume(uuid)')
  ) as f(signature)

  union all
  select
    'schema',
    'trigger ' || t.name || '_set_updated_at',
    exists (
      select 1 from pg_trigger g
      where g.tgrelid = to_regclass('public.' || t.name)
        and g.tgname = t.name || '_set_updated_at'
        and not g.tgisinternal
    ),
    'updates updated_at on every change'
  from expected_tables t
  where t.name <> 'resume_analyses'

  union all
  select 'schema', 'index skills_user_id_name_key', to_regclass('public.skills_user_id_name_key') is not null,
    'one skill name per user, case-insensitive'
)
select area, item, ok, detail
from checks
order by ok, area, item;
