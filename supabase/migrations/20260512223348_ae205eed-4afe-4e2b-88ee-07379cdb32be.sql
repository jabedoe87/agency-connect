-- Switch helper role-check functions to SECURITY INVOKER so signed-in users
-- calling them only see rows allowed by RLS (user_roles "Users can view own role").
-- has_role is always invoked with auth.uid(), so INVOKER returns the same result
-- without bypassing RLS or triggering the SECURITY DEFINER linter warning.

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(_user_id, 'admin');
$$;

-- Keep authenticated able to call has_role for their own RLS checks (no privilege escalation since INVOKER respects RLS).
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;