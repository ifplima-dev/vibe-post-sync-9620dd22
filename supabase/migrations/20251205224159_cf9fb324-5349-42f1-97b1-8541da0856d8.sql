-- Add new columns to connected_accounts for Meta integration
ALTER TABLE public.connected_accounts 
ADD COLUMN IF NOT EXISTS page_id TEXT,
ADD COLUMN IF NOT EXISTS instagram_account_id TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE;

-- Create comments table for caching comments from social platforms
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  platform_comment_id TEXT NOT NULL,
  author_name TEXT,
  author_profile_pic TEXT,
  comment_text TEXT NOT NULL,
  replied BOOLEAN NOT NULL DEFAULT false,
  reply_text TEXT,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for comments
CREATE POLICY "Users can view their own comments"
ON public.comments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own comments"
ON public.comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
ON public.comments
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.comments
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_comments_post_platform ON public.comments(post_id, platform);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);