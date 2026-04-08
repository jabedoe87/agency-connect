CREATE TABLE public.generated_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  content text NOT NULL,
  niche text NOT NULL DEFAULT '',
  preset text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generated content" ON public.generated_content FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own generated content" ON public.generated_content FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own generated content" ON public.generated_content FOR DELETE USING (auth.uid() = user_id);