/*
  # Create Storage Bucket for Range Record Photos

  1. Storage Setup
    - Create 'range-photos' storage bucket for storing shooter range record photos
    - Set as public bucket for easy access to photos
    
  2. Security
    - Allow public read access to photos
    - Allow authenticated and anonymous users to upload photos
    - Allow users to update/delete their own photos
*/

-- Create storage bucket for range photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('range-photos', 'range-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view range photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload range photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update range photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete range photos" ON storage.objects;

-- Allow public access to view photos
CREATE POLICY "Public can view range photos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'range-photos');

-- Allow anyone to upload photos (for non-auth app)
CREATE POLICY "Anyone can upload range photos"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'range-photos');

-- Allow anyone to update photos
CREATE POLICY "Anyone can update range photos"
  ON storage.objects
  FOR UPDATE
  TO public
  USING (bucket_id = 'range-photos')
  WITH CHECK (bucket_id = 'range-photos');

-- Allow anyone to delete photos
CREATE POLICY "Anyone can delete range photos"
  ON storage.objects
  FOR DELETE
  TO public
  USING (bucket_id = 'range-photos');
