-- Add unique constraint for upsert on comments table
ALTER TABLE public.comments 
ADD CONSTRAINT comments_platform_comment_id_platform_key 
UNIQUE (platform_comment_id, platform);

-- Enable realtime for comments table
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;