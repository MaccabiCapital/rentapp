-- ============================================================
-- Sprint 10 — Photo uploads via Supabase Storage
-- ============================================================
-- Apply: paste into Supabase SQL editor and run.
--
-- Creates the `rentapp-photos` Storage bucket and the RLS
-- policies required for authenticated users to upload/read/
-- delete photos scoped by owner_id.
--
-- Folder convention enforced by the upload client:
--   {owner_id}/units/{unit_id}/{photo_id}.{ext}
--   {owner_id}/maintenance/{request_id}/{photo_id}.{ext}
--   {owner_id}/properties/{property_id}/{photo_id}.{ext}
--
-- The owner_id prefix is how RLS checks ownership — we match
-- the first path segment against auth.uid().

-- Create the bucket (private, max 10MB per file, image types only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rentapp-photos',
  'rentapp-photos',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','image/heic']
)
on conflict (id) do nothing;

-- Authenticated users can read their own photos
create policy "owner can select own photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'rentapp-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can upload into their own folder
create policy "owner can insert own photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'rentapp-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can update metadata on their own photos
create policy "owner can update own photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'rentapp-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can delete their own photos
create policy "owner can delete own photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'rentapp-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
