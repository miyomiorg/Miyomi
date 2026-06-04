-- Compatibility Groups System
-- 1. Create compatibility_groups table
CREATE TABLE IF NOT EXISTS public.compatibility_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#6366F1',
  icon_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.compatibility_groups ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_compatibility_groups_updated_at
  BEFORE UPDATE ON public.compatibility_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Anyone can read groups" ON public.compatibility_groups FOR SELECT USING (true);
CREATE POLICY "Admins can manage groups" ON public.compatibility_groups FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Service can manage groups" ON public.compatibility_groups FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Create app_group_memberships junction table
CREATE TABLE IF NOT EXISTS public.app_group_memberships (
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.compatibility_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (app_id, group_id)
);

ALTER TABLE public.app_group_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app memberships" ON public.app_group_memberships FOR SELECT USING (true);
CREATE POLICY "Admins can manage app memberships" ON public.app_group_memberships FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Service can manage app memberships" ON public.app_group_memberships FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Create extension_group_memberships junction table
CREATE TABLE IF NOT EXISTS public.extension_group_memberships (
  extension_id UUID NOT NULL REFERENCES public.extensions(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.compatibility_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (extension_id, group_id)
);

ALTER TABLE public.extension_group_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ext memberships" ON public.extension_group_memberships FOR SELECT USING (true);
CREATE POLICY "Admins can manage ext memberships" ON public.extension_group_memberships FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Service can manage ext memberships" ON public.extension_group_memberships FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. Rename apps.supported_extensions to apps.compatible_with
ALTER TABLE public.apps RENAME COLUMN supported_extensions TO compatible_with;
