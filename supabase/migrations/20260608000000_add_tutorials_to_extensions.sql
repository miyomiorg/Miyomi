-- Add tutorials column to extensions table
ALTER TABLE public.extensions ADD COLUMN IF NOT EXISTS tutorials JSONB;
