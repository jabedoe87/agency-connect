CREATE OR REPLACE FUNCTION public.increment_message_count(_user_id UUID)
RETURNS TABLE(total_messages_sent INTEGER, daily_messages_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
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

REVOKE EXECUTE ON FUNCTION public.increment_message_count(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_message_count(UUID) TO authenticated;