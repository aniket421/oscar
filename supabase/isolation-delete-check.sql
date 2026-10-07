-- Delete-path isolation check for a real Supabase project: the checks that need DELETE statements
-- (the read-only checks live in verify.sql). Paste it into the SQL editor and run it; the editor
-- warns about DELETE statements, which is expected.
--
-- It creates two throwaway users and runs requests the way the Data API does (database role plus
-- JWT claims). It ALWAYS ends with an error whose message lists the results, so every change is
-- rolled back: no users, rows, or files remain, and no email is sent. Every line should start with
-- PASS (INFO lines are notes). tests/db/isolation-delete-check.test.ts runs it against the
-- migrations.
do $qa$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  ra uuid := gen_random_uuid();
  a_file text;
  r text[] := '{}';
  n bigint;
  m bigint;
  t text;
begin
  insert into auth.users (id, email) values
    (a, 'oscar-qa-' || a || '@example.invalid'),
    (b, 'oscar-qa-' || b || '@example.invalid');

  -- User A's data in every table, and one stored file. User B has a profile and an education row.
  a_file := 'user/' || a || '/resume/' || ra || '/original.pdf';
  insert into public.profiles (user_id, full_name) values (a, 'QA A');
  insert into public.candidate_preferences (user_id, target_role) values (a, 'QA role');
  insert into public.education (user_id, institution) values (a, 'QA University');
  insert into public.experience (user_id, company, title) values (a, 'QA Co', 'QA Engineer');
  insert into public.projects (user_id, name) values (a, 'QA Project');
  insert into public.certifications (user_id, name) values (a, 'QA Cert');
  insert into public.resumes
    (id, user_id, file_name, storage_path, file_type, file_size, status, parsed_version, processed_at)
    values (ra, a, 'a.pdf', a_file, 'pdf', 1024, 'processed', 1, now());
  insert into public.resume_parses (resume_id, user_id, parser_version, word_count)
    values (ra, a, 1, 120);
  insert into public.resume_analyses (resume_id, user_id, analyzer_version) values (ra, a, 1);
  insert into public.skills (user_id, name, category, source, resume_id)
    values (a, 'SQL', 'database', 'resume', ra);
  insert into storage.objects (bucket_id, name) values ('resumes', a_file);
  insert into public.profiles (user_id, full_name) values (b, 'QA B');
  insert into public.education (user_id, institution) values (b, 'B University');

  -- User B tries to delete A's data.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', b::text, true);
  execute 'set local role authenticated';

  delete from public.profiles where user_id = a;
  get diagnostics n = row_count;
  r := array_append(r, case when n = 0 then 'PASS' else 'FAIL' end
    || ' B cannot delete A''s profile (' || n || ' rows)');
  delete from public.resumes where id = ra;
  get diagnostics n = row_count;
  r := array_append(r, case when n = 0 then 'PASS' else 'FAIL' end
    || ' B cannot delete A''s resume record (' || n || ' rows)');
  delete from public.resume_parses where resume_id = ra;
  get diagnostics n = row_count;
  r := array_append(r, case when n = 0 then 'PASS' else 'FAIL' end
    || ' B cannot delete A''s parse result (' || n || ' rows)');
  begin
    delete from public.resume_analyses where resume_id = ra;
    r := array_append(r, 'FAIL B was allowed to delete analyses');
  exception when insufficient_privilege then
    r := array_append(r, 'PASS B cannot delete analyses (read-only for users)');
  when others then r := array_append(r, 'FAIL analysis delete: ' || sqlstate);
  end;
  begin
    delete from storage.objects where name = a_file;
    get diagnostics n = row_count;
    r := array_append(r, case when n = 0 then 'PASS' else 'FAIL' end
      || ' B cannot delete A''s file (' || n || ' rows)');
  exception when others then
    r := array_append(r, 'PASS B cannot delete A''s file (refused: ' || sqlstate || ')');
  end;
  -- Without a WHERE clause only the delete policies apply, so this catches a delete policy that is
  -- wider than the read policy.
  begin
    delete from storage.objects;
    get diagnostics n = row_count;
    r := array_append(r, case when n = 0 then 'PASS' else 'FAIL' end
      || ' B''s unfiltered file delete reaches none of A''s files (' || n || ' rows)');
  exception when others then
    r := array_append(r, 'PASS B''s unfiltered file delete is refused (' || sqlstate || ')');
  end;
  update public.profiles set headline = 'mass edit';
  get diagnostics n = row_count;
  r := array_append(r, case when n = 1 then 'PASS' else 'FAIL' end
    || ' B''s unfiltered update reaches only B''s own profile (' || n || ' rows)');
  delete from public.profiles;
  get diagnostics n = row_count;
  r := array_append(r, case when n = 1 then 'PASS' else 'FAIL' end
    || ' B''s unfiltered delete reaches only B''s own profile (' || n || ' rows)');

  execute 'reset role';
  select count(*) into n from public.profiles where user_id = a and headline is null;
  select n + count(*) into n from public.resumes where id = ra;
  select n + count(*) into n from public.resume_parses where resume_id = ra;
  select n + count(*) into n from public.resume_analyses where resume_id = ra;
  select n + count(*) into n from storage.objects where name = a_file;
  r := array_append(r, case when n = 5 then 'PASS' else 'FAIL' end
    || ' A''s profile, resume, parse, analysis, and file intact (' || n || '/5)');

  -- User A deletes own resume record: its parse and analysis go with it, the skill stays unlinked.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', a::text, true);
  execute 'set local role authenticated';
  delete from public.resumes where id = ra;
  get diagnostics n = row_count;
  r := array_append(r, case when n = 1 then 'PASS' else 'FAIL' end
    || ' A can delete own resume record (' || n || ' row)');
  execute 'reset role';
  select count(*) into n from public.resume_parses where resume_id = ra;
  select n + count(*) into n from public.resume_analyses where resume_id = ra;
  r := array_append(r, case when n = 0 then 'PASS' else 'FAIL' end
    || ' deleting a resume removes its parse and analysis (' || n || ' left)');
  select count(*) into n from public.skills where user_id = a and resume_id is null;
  r := array_append(r, case when n = 1 then 'PASS' else 'FAIL' end
    || ' deleting a resume keeps the skill, unlinked (' || n || ')');

  -- Deleting A's account removes every candidate row, and nothing of B's.
  begin
    delete from auth.users where id = a;
    n := 0;
    foreach t in array array['profiles', 'candidate_preferences', 'education', 'experience',
        'projects', 'certifications', 'skills', 'resumes', 'resume_parses', 'resume_analyses'] loop
      execute format('select count(*) from public.%I where user_id = $1', t) into m using a;
      n := n + m;
    end loop;
    r := array_append(r, case when n = 0 then 'PASS' else 'FAIL' end
      || ' deleting an account removes all its candidate rows (' || n || ' left)');
  exception when others then
    r := array_append(r, 'FAIL account deletion: ' || sqlstate || ' ' || sqlerrm);
  end;
  select count(*) into n from public.education where user_id = b;
  r := array_append(r, case when n = 1 then 'PASS' else 'FAIL' end
    || ' another account''s data is untouched (' || n || ')');
  select count(*) into n from storage.objects where name like 'user/' || a || '/%';
  r := array_append(r, 'INFO stored files are removed by the app through the Storage API, not by'
    || ' account deletion (' || n || ' left here)');

  raise exception 'QA_RESULT delete-checks passed=% failed=% (rolled back)%',
    (select count(*) from unnest(r) as res(line) where res.line like 'PASS%'),
    (select count(*) from unnest(r) as res(line) where res.line like 'FAIL%'),
    E'\n' || array_to_string(r, E'\n');
end
$qa$;
