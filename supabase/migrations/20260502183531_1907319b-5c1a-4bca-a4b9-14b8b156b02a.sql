-- Add subscription_status and grace_period_ends_at to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ;

-- Constraint on allowed values
DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_subscription_status_check
    CHECK (subscription_status IN ('trialing','active','past_due','grace_period','canceled','inactive'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill from existing plan column
UPDATE public.profiles SET subscription_status = CASE
  WHEN plan IN ('starter','pro','business') THEN 'active'
  WHEN plan = 'past_due' THEN 'past_due'
  WHEN plan = 'trial' AND trial_ends_at > now() THEN 'trialing'
  WHEN plan = 'trial' AND trial_ends_at <= now() THEN 'inactive'
  ELSE 'trialing'
END;

-- Canonical access helper: binary HAS_ACCESS logic
CREATE OR REPLACE FUNCTION public.has_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id
      AND (
        p.subscription_status = 'active'
        OR (p.subscription_status = 'trialing' AND p.trial_ends_at > now())
        OR (p.subscription_status = 'grace_period' AND p.grace_period_ends_at > now())
      )
  );
$$;

-- Keep is_active_subscriber as alias for backwards compat with existing RLS
CREATE OR REPLACE FUNCTION public.is_active_subscriber(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_access(_user_id);
$$;

-- Index for fast access checks
CREATE INDEX IF NOT EXISTS profiles_subscription_status_idx
  ON public.profiles(subscription_status);