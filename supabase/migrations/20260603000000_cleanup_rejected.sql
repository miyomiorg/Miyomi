-- Create a function to delete old rejected submissions and edit suggestions
CREATE OR REPLACE FUNCTION public.cleanup_old_rejected()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete rejected submissions older than 7 days
    DELETE FROM public.submissions 
    WHERE status = 'rejected' AND updated_at < now() - interval '7 days';

    -- Delete rejected edit suggestions older than 7 days
    DELETE FROM public.public_edit_suggestions 
    WHERE status = 'rejected' AND updated_at < now() - interval '7 days';
END;
$$;
