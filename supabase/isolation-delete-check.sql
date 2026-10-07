-- Delete-path isolation check for a real Supabase project: the checks that need DELETE statements
-- (the read-only checks live in verify.sql). Paste it into the SQL editor and run it; the editor
-- warns about DELETE statements, which is expected.
--
-- It creates three throwaway users and runs requests the way the Data API and Storage API do
-- (database role plus JWT claims; file deletes opted in as the Storage API opts in). It ALWAYS
-- ends with an error whose message lists the results, so every change is rolled back: no users,
-- rows, or files remain, and no email is sent. Every result should start with PASS (INFO lines
-- are notes). tests/db/isolation-delete-check.test.ts runs it against the migrations, including
-- weakened policies and foreign keys that each must fail a check.
do $qa$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  ra uuid := gen_random_uuid();
  rb uuid := gen_random_uuid();
  rc uuid := gen_random_uuid();
  ra2 uuid := gen_random_uuid();
  uids uuid[];
  rids uuid[];
  names text[] := array['A', 'B'];
  -- Child tables first, so each unfiltered delete below meets exactly one row of its own.
  deletable text[] := array['resume_parses', 'skills', 'profiles', 'candidate_preferences',
    'education', 'experience', 'projects', 'certifications', 'resumes'];
  all_tables text[] := array['profiles', 'candidate_preferences', 'education', 'experience',
    'projects', 'certifications', 'skills', 'resumes', 'resume_parses', 'resume_analyses'];
  missing text[] := '{}';
  r text[] := '{}';
  n bigint;
  m bigint;
  t text;
  i int;
begin
  -- The Storage API opts every request in to deleting rows of storage.objects, and the delete
  -- policies then decide. Without the opt-in, Supabase's protect_objects_delete trigger refuses
  -- every direct delete before any policy is consulted, which would prove nothing.
  perform set_config('storage.allow_delete_query', 'true', true);

  insert into auth.users (id, email) values
    (a, 'oscar-qa-' || a || '@example.invalid'),
    (b, 'oscar-qa-' || b || '@example.invalid'),
    (c, 'oscar-qa-' || c || '@example.invalid');

  -- Users A and B: one row in every candidate table and one stored file each.
  uids := array[a, b];
  rids := array[ra, rb];
  for i in 1..2 loop
    insert into public.profiles (user_id, full_name) values (uids[i], 'QA ' || names[i]);
    insert into public.candidate_preferences (user_id, target_role) values (uids[i], 'QA role');
    insert into public.education (user_id, institution) values (uids[i], 'QA University');
    insert into public.experience (user_id, company, title) values (uids[i], 'QA Co', 'QA Engineer');
    insert into public.projects (user_id, name) values (uids[i], 'QA Project');
    insert into public.certifications (user_id, name) values (uids[i], 'QA Cert');
    insert into public.resumes
      (id, user_id, file_name, storage_path, file_type, file_size, status, parsed_version, processed_at)
      values (rids[i], uids[i], 'qa.pdf', 'user/' || uids[i] || '/resume/' || rids[i] || '/original.pdf',
        'pdf', 1024, 'processed', 1, now());
    insert into public.resume_parses (resume_id, user_id, parser_version, word_count)
      values (rids[i], uids[i], 1, 120);
    insert into public.resume_analyses (resume_id, user_id, analyzer_version) values (rids[i], uids[i], 1);
    insert into public.skills (user_id, name, category, source, resume_id)
      values (uids[i], 'SQL', 'database', 'resume', rids[i]);
    insert into storage.objects (bucket_id, name)
      values ('resumes', 'user/' || uids[i] || '/resume/' || rids[i] || '/original.pdf');
  end loop;
  -- User C: a bystander whose data must survive everything below.
  insert into public.profiles (user_id, full_name) values (c, 'QA C');
  insert into public.resumes (id, user_id, file_name, storage_path, file_type, file_size)
    values (rc, c, 'c.pdf', 'user/' || c || '/resume/' || rc || '/original.pdf', 'pdf', 512);
  insert into storage.objects (bucket_id, name)
    values ('resumes', 'user/' || c || '/resume/' || rc || '/original.pdf');

  -- 1. A tries to delete B's rows and file, then B tries the same against A.
  for i in 1..2 loop
    perform set_config('request.jwt.claims', json_build_object('sub', uids[i], 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', uids[i]::text, true);
    execute 'set local role authenticated';
    foreach t in array deletable loop
      begin
        execute format('delete from public.%I where user_id = $1', t) using uids[3 - i];
        get diagnostics n = row_count;
        r := array_append(r, case when n = 0 then 'PASS' else 'FAIL' end
          || format(' %s cannot delete %s''s %s (%s rows)', names[i], names[3 - i], t, n));
      exception when others then
        r := array_append(r, format('FAIL %s delete of %s''s %s errored: %s', names[i], names[3 - i], t, sqlstate));
      end;
    end loop;
    begin
      delete from public.resume_analyses where user_id = uids[3 - i];
      r := array_append(r, format('FAIL %s was allowed to delete analyses', names[i]));
    exception when insufficient_privilege then
      r := array_append(r, format('PASS %s cannot delete analyses (read-only for users)', names[i]));
    when others then
      r := array_append(r, format('FAIL %s analysis delete errored: %s', names[i], sqlstate));
    end;
    begin
      delete from storage.objects where name like 'user/' || uids[3 - i] || '/%';
      get diagnostics n = row_count;
      r := array_append(r, case when n = 0 then 'PASS' else 'FAIL' end
        || format(' %s cannot delete %s''s files (%s rows)', names[i], names[3 - i], n));
    exception when others then
      r := array_append(r, format('FAIL %s file delete refused before the policies decided: %s', names[i], sqlstate));
    end;
    execute 'reset role';
  end loop;
  for i in 1..2 loop
    n := 0;
    foreach t in array all_tables loop
      execute format('select count(*) from public.%I where user_id = $1', t) into m using uids[i];
      n := n + m;
    end loop;
    select count(*) into m from storage.objects where name like 'user/' || uids[i] || '/%';
    r := array_append(r, case when n = 10 and m = 1 then 'PASS' else 'FAIL' end
      || format(' %s''s rows and file intact (%s/10 rows, %s/1 file)', names[i], n, m));
  end loop;

  -- 2. B deletes without a filter. Then only the delete policies apply (a WHERE clause would also
  -- bring in the read policies), so this catches a delete policy wider than the read policy.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', b::text, true);
  execute 'set local role authenticated';
  update public.profiles set headline = 'mass edit';
  get diagnostics n = row_count;
  r := array_append(r, case when n = 1 then 'PASS' else 'FAIL' end
    || format(' B''s unfiltered update reaches only B''s own profile (%s rows)', n));
  foreach t in array deletable loop
    begin
      execute format('delete from public.%I', t);
      get diagnostics n = row_count;
      r := array_append(r, case when n = 1 then 'PASS' else 'FAIL' end
        || format(' B''s unfiltered delete on %s reaches only B''s own row (%s rows)', t, n));
    exception when others then
      r := array_append(r, format('FAIL B''s unfiltered delete on %s errored: %s', t, sqlstate));
    end;
  end loop;
  begin
    delete from storage.objects;
    get diagnostics n = row_count;
    r := array_append(r, case when n = 1 then 'PASS' else 'FAIL' end
      || format(' B''s unfiltered file delete reaches only B''s own file (%s rows)', n));
  exception when others then
    r := array_append(r, 'FAIL B''s unfiltered file delete refused before the policies decided: ' || sqlstate);
  end;
  execute 'reset role';
  n := 0;
  foreach t in array all_tables loop
    execute format('select count(*) from public.%I where user_id = $1', t) into m using a;
    n := n + m;
  end loop;
  select count(*) into m from storage.objects where name like 'user/' || a || '/%';
  r := array_append(r, case when n = 10 and m = 1 then 'PASS' else 'FAIL' end
    || format(' A''s rows and file survive B''s unfiltered deletes (%s/10 rows, %s/1 file)', n, m));
  select count(*) into n from public.profiles where user_id = a and headline is null;
  r := array_append(r, case when n = 1 then 'PASS' else 'FAIL' end
    || format(' A''s profile survives B''s unfiltered update (%s)', n));

  -- 3. A deletes own resume record: its parse and analysis go with it, the skill stays unlinked.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', a::text, true);
  execute 'set local role authenticated';
  delete from public.resumes where id = ra;
  get diagnostics n = row_count;
  r := array_append(r, case when n = 1 then 'PASS' else 'FAIL' end
    || format(' A can delete own resume record (%s row)', n));
  execute 'reset role';
  select count(*) into n from public.resume_parses where resume_id = ra;
  select n + count(*) into n from public.resume_analyses where resume_id = ra;
  r := array_append(r, case when n = 0 then 'PASS' else 'FAIL' end
    || format(' deleting a resume removes its parse and analysis (%s left)', n));
  select count(*) into n from public.skills where user_id = a and resume_id is null;
  r := array_append(r, case when n = 1 then 'PASS' else 'FAIL' end
    || format(' deleting a resume keeps the skill, unlinked (%s)', n));

  -- 4. Deleting A's account, with A's data in every table, removes all of it and nothing else.
  insert into public.resumes
    (id, user_id, file_name, storage_path, file_type, file_size, status, parsed_version, processed_at)
    values (ra2, a, 'qa2.pdf', 'user/' || a || '/resume/' || ra2 || '/original.pdf', 'pdf', 1024,
      'processed', 1, now());
  insert into public.resume_parses (resume_id, user_id, parser_version, word_count) values (ra2, a, 1, 120);
  insert into public.resume_analyses (resume_id, user_id, analyzer_version) values (ra2, a, 1);
  foreach t in array all_tables loop
    execute format('select count(*) from public.%I where user_id = $1', t) into m using a;
    if m = 0 then missing := array_append(missing, t); end if;
  end loop;
  r := array_append(r, case when cardinality(missing) = 0
    then 'PASS A has rows in all 10 tables before the account is deleted'
    else 'FAIL A has no rows before the account is deleted in: ' || array_to_string(missing, ', ') end);
  begin
    delete from auth.users where id = a;
    n := 0;
    foreach t in array all_tables loop
      execute format('select count(*) from public.%I where user_id = $1', t) into m using a;
      n := n + m;
    end loop;
    r := array_append(r, case when n = 0 then 'PASS' else 'FAIL' end
      || format(' deleting an account removes its rows from all 10 tables (%s left)', n));
  exception when others then
    r := array_append(r, 'FAIL account deletion: ' || sqlstate || ' ' || sqlerrm);
  end;
  select count(*) into n from public.profiles where user_id = c;
  select n + count(*) into n from public.resumes where user_id = c;
  select n + count(*) into n from storage.objects where name like 'user/' || c || '/%';
  r := array_append(r, case when n = 3 then 'PASS' else 'FAIL' end
    || format(' a bystander''s profile, resume, and file are untouched (%s/3)', n));
  select count(*) into n from storage.objects where name like 'user/' || a || '/%';
  r := array_append(r, format('INFO deleting an account leaves its stored files (%s here); Oscar has'
    || ' no account deletion flow yet, so they must be removed through the Storage API', n));

  raise exception 'QA_RESULT delete-checks passed=% failed=% (rolled back)%',
    (select count(*) from unnest(r) as res(line) where res.line like 'PASS%'),
    (select count(*) from unnest(r) as res(line) where res.line like 'FAIL%'),
    E'\n' || array_to_string(r, E'\n');
end
$qa$;
