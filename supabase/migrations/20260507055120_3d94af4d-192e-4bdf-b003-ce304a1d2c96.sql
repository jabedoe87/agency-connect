CREATE TABLE IF NOT EXISTS public.payments_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL,
  event_type text NOT NULL,
  status text NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view payments log"
ON public.payments_log
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_payments_log_event_id ON public.payments_log(stripe_event_id);