REVOKE EXECUTE ON FUNCTION public.is_active_subscriber(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_subscriber(uuid) TO service_role;