-- Create storage bucket for campaign intelligence documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-intelligence-docs',
  'campaign-intelligence-docs',
  false,
  26214400, -- 25MB limit
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Create storage policies for campaign intelligence documents
CREATE POLICY "Users can upload their own campaign documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'campaign-intelligence-docs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own campaign documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'campaign-intelligence-docs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own campaign documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'campaign-intelligence-docs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own campaign documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'campaign-intelligence-docs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );