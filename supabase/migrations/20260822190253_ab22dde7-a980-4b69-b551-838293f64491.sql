CREATE TABLE public.ai_caption_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  tone TEXT NOT NULL DEFAULT 'descontraido',
  caption_length TEXT NOT NULL DEFAULT 'media',
  use_emoji BOOLEAN NOT NULL DEFAULT true,
  hashtag_count INTEGER NOT NULL DEFAULT 10,
  cta TEXT,
  extra_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_caption_settings TO authenticated;
GRANT ALL ON public.ai_caption_settings TO service_role;

ALTER TABLE public.ai_caption_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ai caption settings"
ON public.ai_caption_settings FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_ai_caption_settings_updated_at
BEFORE UPDATE ON public.ai_caption_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();