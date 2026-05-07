-- Switch increment_message_count to SECURITY INVOKER so it relies on existing RLS
-- (profiles UPDATE policy already restricts to auth.uid() = user_id)
CREATE OR REPLACE FUNCTION public.increment_message_count(_user_id uuid)
RETURNS TABLE(total_messages_sent integer, daily_messages_count integer)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  today DATE := CURRENT_DATE;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.profiles
  SET daily_messages_count = 0, daily_reset_date = today
  WHERE user_id = _user_id AND daily_reset_date < today;

  RETURN QUERY
  UPDATE public.profiles
  SET total_messages_sent = profiles.total_messages_sent + 1,
      daily_messages_count = profiles.daily_messages_count + 1
  WHERE user_id = _user_id
  RETURNING profiles.total_messages_sent, profiles.daily_messages_count;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_message_count(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_message_count(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_message_count(uuid) TO authenticated;