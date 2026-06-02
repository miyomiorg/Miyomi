-- 1. Modify submissions table
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS submitter_user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- 2. Create public_edit_suggestions table
CREATE TABLE IF NOT EXISTS public.public_edit_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type TEXT NOT NULL, -- 'app' or 'extension'
    target_id TEXT NOT NULL,
    original_data_snapshot JSONB NOT NULL DEFAULT '{}',
    submitted_data JSONB NOT NULL DEFAULT '{}',
    approved_data JSONB,
    submitter_name TEXT,
    submitter_contact TEXT,
    submitter_user_id UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'pending',
    admin_note TEXT,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.public_edit_suggestions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_public_edit_suggestions_updated_at BEFORE UPDATE ON public.public_edit_suggestions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Service can insert edit suggestions" ON public.public_edit_suggestions FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Admins can manage edit suggestions" ON public.public_edit_suggestions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


-- 3. Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type TEXT NOT NULL, -- 'app', 'extension', 'page', 'other'
    target_id TEXT,
    page_url TEXT,
    reason TEXT NOT NULL,
    message TEXT,
    reporter_name TEXT,
    reporter_contact TEXT,
    reporter_user_id UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'new', -- 'new', 'reviewing', 'resolved', 'dismissed'
    admin_note TEXT,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Service can insert reports" ON public.reports FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Admins can manage reports" ON public.reports FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


-- 4. Create feedbacks table
CREATE TABLE IF NOT EXISTS public.feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_type TEXT,
    message TEXT NOT NULL,
    page_url TEXT,
    user_name TEXT,
    user_contact TEXT,
    user_id UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'new', -- 'new', 'reviewed', 'archived'
    admin_note TEXT,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_feedbacks_updated_at BEFORE UPDATE ON public.feedbacks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Service can insert feedbacks" ON public.feedbacks FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Admins can manage feedbacks" ON public.feedbacks FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

