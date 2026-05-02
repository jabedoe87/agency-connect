-- Helper: is the current user an active subscriber (paid plan OR unexpired trial)?
CREATE OR REPLACE FUNCTION public.is_active_subscriber(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = _user_id
      AND (
        p.plan IN ('starter', 'pro', 'business')
        OR (p.plan = 'trial' AND p.trial_ends_at > now())
      )
  );
$$;

-- Enforce active-subscription requirement on content creation
DROP POLICY IF EXISTS "Users can insert own generated content" ON public.generated_content;
CREATE POLICY "Active subscribers can insert own generated content"
  ON public.generated_content
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_active_subscriber(auth.uid())
  );

-- Lock out non-paying users immediately: any user without a real paid plan
-- has their trial end set to now(). Users on starter/pro/business are untouched.
UPDATE public.profiles
SET trial_ends_at = now()
WHERE plan NOT IN ('starter', 'pro', 'business')
  AND trial_ends_at > now();
