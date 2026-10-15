-- Storage buckets for uploads (15 Oct 2026).
-- Uploads go through the server with the service role key (src/lib/storage.ts),
-- which checks who may upload and chooses the path. Signed-in users therefore
-- never write to storage directly.
-- Safe to run more than once.

begin;

-- 1. tenant-logos: business logos shown on invoices, PDFs and the customer portal.
--    Public read (logos are printed on documents), PNG/JPEG only, 1 MB max.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tenant-logos', 'tenant-logos', true, 1048576, array['image/png', 'image/jpeg'])
on conflict (id) do update
  set public = true,
      file_size_limit = 1048576,
      allowed_mime_types = array['image/png', 'image/jpeg'];

--    The old policies let ANY signed-in user (any business) upload or overwrite
--    any file in this bucket. Remove them; the server uploads instead.
drop policy if exists "Authenticated Upload tenant-logos" on storage.objects;
drop policy if exists "Authenticated Update tenant-logos" on storage.objects;
--    "Public Access tenant-logos" (read) stays.

-- 2. site-media: images for the public website (Super Admin → Website).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media', 'site-media', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

drop policy if exists "Public read site-media" on storage.objects;
create policy "Public read site-media" on storage.objects
  for select to public using (bucket_id = 'site-media');

-- 3. site-private: job applicants' CVs. Private (no read policy at all): only the
--    server, with the service role key, can read them for Super Admin.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-private', 'site-private', false, 5242880,
        array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

commit;
