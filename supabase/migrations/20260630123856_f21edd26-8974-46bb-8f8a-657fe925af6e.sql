
-- 1) Storage: remove broad public SELECT (prevents listing). Public URLs still work for public buckets.
DROP POLICY IF EXISTS "Public can view videos" ON storage.objects;

-- 2) Lock down SECURITY DEFINER function
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 3) Revoke column-level SELECT on sensitive token fields from API roles.
REVOKE SELECT (access_token, refresh_token) ON public.connected_accounts FROM anon, authenticated;

-- 4) Explicit deny-write policies on video_stats for end users (defense in depth; service_role bypasses RLS)
CREATE POLICY "Deny insert to end users" ON public.video_stats FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "Deny update to end users" ON public.video_stats FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny delete to end users" ON public.video_stats FOR DELETE TO anon, authenticated USING (false);
