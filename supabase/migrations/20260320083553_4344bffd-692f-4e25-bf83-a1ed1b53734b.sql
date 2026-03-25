
-- Create content bucket (public so images are accessible)
INSERT INTO storage.buckets (id, name, public)
VALUES ('content', 'content', true);

-- Allow anyone to read files from the content bucket
CREATE POLICY "Public read access on content bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'content');

-- Allow authenticated users to upload to content bucket
CREATE POLICY "Authenticated upload to content bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'content');
