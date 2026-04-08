ALTER TABLE public.generated_content
  ALTER COLUMN content TYPE jsonb USING content::jsonb,
  ADD COLUMN IF NOT EXISTS project_id uuid;