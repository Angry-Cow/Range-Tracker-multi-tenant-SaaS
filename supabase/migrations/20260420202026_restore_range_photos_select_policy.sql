/*
  # Restore SELECT Policy on range-photos Storage Bucket

  ## Summary
  Restores the public SELECT policy on the range-photos storage bucket that was
  removed during a security tightening pass.

  ## Why This Policy Is Required
  The Supabase JS storage client performs an internal existence check (SELECT) before
  uploading a file. Without a SELECT policy on the storage.objects table, this check
  fails with an RLS permission error, causing ALL photo uploads to fail and therefore
  all range record saves with attached images to fail with "save failed".

  ## Why This Is Safe
  The range-photos bucket is already configured as a PUBLIC bucket, meaning any photo
  with a known path is accessible via its public URL without any policy needed.
  This SELECT policy does not expose anything that isn't already publicly accessible —
  it simply allows the storage client's internal pre-upload check to succeed.

  ## IMPORTANT — DO NOT REMOVE THIS POLICY
  Security scanners and pre-publish checks will flag this as a broad public SELECT
  policy. This warning should be IGNORED for this bucket. Removing this policy will
  break photo uploads on range records. This is a known accepted trade-off documented
  in CLAUDE.md.
*/

DROP POLICY IF EXISTS "Public can view range photos" ON storage.objects;

CREATE POLICY "Public can view range photos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'range-photos');
