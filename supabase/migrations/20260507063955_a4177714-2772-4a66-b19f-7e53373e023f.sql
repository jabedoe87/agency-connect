-- Consolidate increment_message_count: drop any prior versions, recreate single hardened version
DROP FUNCTION IF EXISTS public.increment_message_count(uuid);

CREATE OR REPLACE FUNCTION public.increment_message_count(_user_id uuid)
RETURNS TABLE(total_messages_sent integer, daily_messages_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today DATE := CURRENT_DATE;
BEGIN
  -- Authorization: caller must be authenticated and operating on their own row
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  -- Daily reset
  UPDATE public.profiles
  SET daily_messages_count = 0, daily_reset_date = today
  WHERE user_id = _user_id AND daily_reset_date < today;

  -- Increment counters and return new values
  RETURN QUERY
  UPDATE public.profiles
  SET total_messages_sent = profiles.total_messages_sent + 1,
      daily_messages_count = profiles.daily_messages_count + 1
  WHERE user_id = _user_id
  RETURNING profiles.total_messages_sent, profiles.daily_messages_count;
END;
$$;

-- Lock down EXECUTE: deny anon/public, allow only authenticated users
REVOKE ALL ON FUNCTION public.increment_message_count(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_message_count(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_message_count(uuid) TO authenticated;