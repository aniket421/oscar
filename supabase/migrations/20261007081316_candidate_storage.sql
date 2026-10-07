-- Private storage for resumes and profile photos.
-- See docs/candidate-intelligence.md (section 4).
--
-- Object names follow user/<user id>/resume/<resume id>/original.<pdf|docx>
-- and user/<user id>/avatar/<avatar id>.<png|jpg|webp>. Buckets are private: there are no public
-- URLs, and the policies below let a signed-in user reach only objects in their own folder.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'resumes',
    'resumes',
    false,
    5242880,
    array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  ),
  ('avatars', 'avatars', false, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- resumes bucket
create policy resume_objects_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = 'user'
    and (storage.foldername(name))[2] = (select auth.uid()::text)
    and (storage.foldername(name))[3] = 'resume'
  );

create policy resume_objects_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'resumes'
    and name ~ ('^user/' || (select auth.uid()::text) || '/resume/[0-9a-f-]{36}/original\.(pdf|docx)$')
  );

create policy resume_objects_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = 'user'
    and (storage.foldername(name))[2] = (select auth.uid()::text)
    and (storage.foldername(name))[3] = 'resume'
  )
  with check (
    bucket_id = 'resumes'
    and name ~ ('^user/' || (select auth.uid()::text) || '/resume/[0-9a-f-]{36}/original\.(pdf|docx)$')
  );

create policy resume_objects_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = 'user'
    and (storage.foldername(name))[2] = (select auth.uid()::text)
    and (storage.foldername(name))[3] = 'resume'
  );

-- avatars bucket
create policy avatar_objects_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'user'
    and (storage.foldername(name))[2] = (select auth.uid()::text)
    and (storage.foldername(name))[3] = 'avatar'
  );

create policy avatar_objects_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and name ~ ('^user/' || (select auth.uid()::text) || '/avatar/[0-9a-f-]{36}\.(png|jpg|webp)$')
  );

create policy avatar_objects_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'user'
    and (storage.foldername(name))[2] = (select auth.uid()::text)
    and (storage.foldername(name))[3] = 'avatar'
  )
  with check (
    bucket_id = 'avatars'
    and name ~ ('^user/' || (select auth.uid()::text) || '/avatar/[0-9a-f-]{36}\.(png|jpg|webp)$')
  );

create policy avatar_objects_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'user'
    and (storage.foldername(name))[2] = (select auth.uid()::text)
    and (storage.foldername(name))[3] = 'avatar'
  );
