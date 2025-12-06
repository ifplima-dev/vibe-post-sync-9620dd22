-- Add columns for multiple media support (carousel)
ALTER TABLE scheduled_posts 
ADD COLUMN IF NOT EXISTS media_urls text[] DEFAULT NULL;

ALTER TABLE scheduled_posts 
ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'video';