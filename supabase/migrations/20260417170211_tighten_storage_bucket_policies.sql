/*
  # Tighten Storage Bucket RLS Policies for range-photos

  ## Summary
  The range-photos storage bucket is public, meaning any object with a known path can be
  fetched directly via its public URL without any SELECT policy needed. However, the existing
  SELECT policy allows listing the entire bucket directory, which exposes all file paths.

  ## Changes

  ### Storage Policies Modified
  - DROP the broad "Public can view range photos" SELECT policy (bucket listing is not needed;
    public buckets serve individual file URLs without a SELECT policy)
  - KEEP the "Anyone can upload range photos" INSERT policy (frontend uploads use the anon key
    directly via the Supabase storage client, so this must remain)
  - DROP the "Anyone can update range photos" UPDATE policy (no legitimate use case for
    unauthenticated updates to existing objects; upsert on upload covers the upload case)
  - DROP the "Anyone can delete range photos" DELETE policy (no legitimate use case for
    unauthenticated deletion of photos)

  ## Security Impact
  - Prevents unauthenticated clients from listing/enumerating all file paths in the bucket
  - Direct public URL access to individual photos continues to work (public bucket behaviour)
  - Photo uploads continue to work (INSERT policy retained)
  - Removes ability for unauthenticated clients to delete or overwrite arbitrary photos
*/

-- Drop the broad SELECT (listing) policy
DROP POLICY IF EXISTS "Public can view range photos" ON storage.objects;

-- Drop the open UPDATE policy — no anonymous user should overwrite arbitrary objects
DROP POLICY IF EXISTS "Anyone can update range photos" ON storage.objects;

-- Drop the open DELETE policy — no anonymous user should delete arbitrary objects
DROP POLICY IF EXISTS "Anyone can delete range photos" ON storage.objects;

-- The INSERT policy "Anyone can upload range photos" is intentionally retained.
-- Frontend photo uploads use the anon key directly via supabase-js storage client.
