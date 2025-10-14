-- Create storage bucket for issue photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('issue-photos', 'issue-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for issue photos
CREATE POLICY "Anyone can view issue photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'issue-photos');

CREATE POLICY "Authenticated users can upload issue photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'issue-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own issue photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'issue-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own issue photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'issue-photos' AND auth.uid() IS NOT NULL);