-- Helper function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.email_send_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  recipient_email TEXT NOT NULL,
  template_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  provider_message_id TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_send_log_user ON public.email_send_log(user_id);
CREATE INDEX idx_email_send_log_status ON public.email_send_log(status);
CREATE INDEX idx_email_send_log_created ON public.email_send_log(created_at DESC);

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id AND email = 'jabedoe87@gmail.com'
  );
$$;

CREATE POLICY "Admin can view all email logs"
ON public.email_send_log FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view their own email logs"
ON public.email_send_log FOR SELECT
USING (auth.uid() = user_id);

CREATE TRIGGER email_send_log_updated_at
BEFORE UPDATE ON public.email_send_log
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();