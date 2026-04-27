-- ============================================================
-- Storage RLS for lease-signatures bucket
-- ============================================================
-- Apply: paste into Supabase SQL editor and run.
--
-- Backfill for the original 2026_04_27_lease_signatures.sql which
-- created the lease-signatures bucket but forgot to add storage
-- RLS policies. Without these, authenticated landlords can't write
-- to the bucket via the session client — every counter-sign fails
-- with "new row violates row-level security policy".
--
-- Path scheme: {owner_id}/{lease_id}/{party}-{sig_id}.png
-- so the first folder segment IS the owner. Authenticated landlords
-- can read/write within their own folder; nobody else has access
-- via session client. Tenant signing path uses service role and
-- bypasses these policies entirely.

CREATE POLICY "lease_signatures_owner_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'lease-signatures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "lease_signatures_owner_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'lease-signatures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "lease_signatures_owner_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'lease-signatures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "lease_signatures_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'lease-signatures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
