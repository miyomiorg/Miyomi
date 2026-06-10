import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AdminFormField, AdminInput, AdminTextarea, AdminButton } from '@/components/admin/AdminFormElements';
import { UploadCloud, CheckCircle2, AlertCircle, FileText, ArrowRight, ArrowLeft, Github, LayoutGrid, Type, AlertTriangle, ExternalLink, RefreshCw, Layers, Terminal, Lock, Globe, Server, Hash, FileJson, Link, Search, Loader2, MessageSquare, StickyNote, Puzzle, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import Turnstile from 'react-turnstile';
import { SharedAppForm } from '@/components/forms/SharedAppForm';
import { BackButton } from '@/components/BackButton';
import { SharedExtensionForm } from '@/components/forms/SharedExtensionForm';
import { emptyApp } from '@/pages/admin/AdminAppFormPage';
import { emptyExt } from '@/pages/admin/AdminExtensionFormPage';
import { InstallUrlEntry } from '@/components/admin/InstallUrlsInput';

export function SubmitPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const STEP_MAP: Record<string, number> = { select: 0, guidelines: 1, form: 2, success: 3 };
  const STEP_NAMES = ['select', 'guidelines', 'form', 'success'];

  const urlTypeRaw = searchParams.get('type');
  const type = urlTypeRaw === 'software' ? 'app' : (urlTypeRaw === 'extensions' ? 'extension' : null);

  const urlStep = searchParams.get('step');
  const urlMode = searchParams.get('mode');
  const urlId = searchParams.get('id');

  const defaultStep = urlMode === 'edit' ? 2 : 0;
  const step = urlStep ? (STEP_MAP[urlStep] ?? defaultStep) : defaultStep;

  const [enabled, setEnabled] = useState(true);
  const [disabledReason, setDisabledReason] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      try {
        const isEdit = urlMode === 'edit';
        const keyPrefix = isEdit ? 'edit_suggestions' : 'submissions';
        const { data: enabledData } = await supabase.from('settings').select('value').eq('key', `${keyPrefix}_enabled`).single();
        const { data: reasonData } = await supabase.from('settings').select('value').eq('key', `${keyPrefix}_disabled_reason`).single();
        if (enabledData && (enabledData.value === 'false' || enabledData.value === false)) {
          setEnabled(false);
          setDisabledReason(reasonData?.value || (isEdit ? 'Edit suggestions are currently disabled.' : 'Submissions are currently disabled.'));
        }
      } catch (err) {
        // Assume enabled if fetch fails
      }
      setLoadingConfig(false);
    }
    checkStatus();
  }, [urlMode]);

  useEffect(() => {
    if (step > 0 && !type) {
      setSearchParams({}, { replace: true });
    }
  }, [step, type]);

  const [originalDataSnapshot, setOriginalDataSnapshot] = useState<any>(null);
  const [initialFormSnapshot, setInitialFormSnapshot] = useState<any>(null);
  const [loadingInitial, setLoadingInitial] = useState(urlMode === 'edit');

  const [appForm, setAppForm] = useState(emptyApp);
  const [extForm, setExtForm] = useState(emptyExt);

  const [submitterForm, setSubmitterForm] = useState({
    submitter_name: '',
    submitter_contact: '',
    submitter_notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState(import.meta.env.VITE_DISABLE_TURNSTILE === 'true' ? 'dummy-token' : '');
  const [nameError, setNameError] = useState<{ message: string; url?: string } | null>(null);

  useEffect(() => {
    async function loadEditData() {
      if (urlMode === 'edit' && type && urlId) {
        setLoadingInitial(true);
        try {
          const table = type === 'app' ? 'apps' : 'extensions';
          const { data: rawData, error } = await supabase.from(table).select('*').eq('id', urlId).single();
          if (error) throw error;
          const data = rawData as any;
          if (data) {
            setOriginalDataSnapshot(data);
            if (type === 'app') {
              const normalized = {
                ...emptyApp,
                ...data,
                platforms: data.platforms || [],
                tags: data.tags || [],
                content_types: data.content_types || [],
                social_urls: (Array.isArray(data.social_urls) && data.social_urls.length > 0)
                  ? data.social_urls.filter((u: string) => u)
                  : (data.discord_url ? [data.discord_url] : []),
                tutorials: Array.isArray(data.tutorials) ? data.tutorials : []
              };
              setAppForm(normalized);
              setInitialFormSnapshot(normalized);
            } else {
              const meta = data.metadata as any;
              let loadedInstallUrls: InstallUrlEntry[] = [];
              if (meta?.install_urls && Array.isArray(meta.install_urls) && meta.install_urls.length > 0) {
                loadedInstallUrls = meta.install_urls;
              } else {
                if (data.auto_url) loadedInstallUrls.push({ label: 'Auto Install', url: data.auto_url, type: 'auto' });
                if (data.manual_url) loadedInstallUrls.push({ label: 'Copy URL', url: data.manual_url, type: 'copy' });
              }

              const normalized = {
                ...emptyExt,
                ...data,
                platforms: data.platforms || [],
                tags: data.tags || [],
                types: data.types || [],
                compatible_with: data.compatible_with || [],
                install_urls: loadedInstallUrls,
                social_urls: (Array.isArray(data.social_urls) && data.social_urls.length > 0)
                  ? data.social_urls.filter((u: string) => u)
                  : (data.discord_url ? [data.discord_url] : []),
                tutorials: Array.isArray(data.tutorials) ? data.tutorials : []
              };
              setExtForm(normalized);
              setInitialFormSnapshot(normalized);
            }
          }
        } catch (err) {
          console.error("Failed to load original data", err);
          toast.error("Failed to load existing data for editing");
        } finally {
          setLoadingInitial(false);
        }
      }
    }
    loadEditData();
  }, [urlMode, type, urlId]);

  function goTo(newStep: number, newType?: 'app' | 'extension' | null) {
    const t = newType !== undefined ? newType : type;
    const params: Record<string, string> = {};
    if (t) params.type = t === 'app' ? 'software' : (t === 'extension' ? 'extensions' : t);
    if (newStep > 0) params.step = STEP_NAMES[newStep];
    setSearchParams(params, { replace: false });
  }

  useEffect(() => {
    const currentName = type === 'app' ? appForm.name : extForm.name;
    const checkDuplicates = async () => {
      if (!currentName) {
        setNameError(null);
        return;
      }

      const timeoutId = setTimeout(async () => {
        try {
          if (currentName) {
            const { data: appData } = await (supabase.from('apps') as any)
              .select('id, name')
              .ilike('name', currentName)
              .maybeSingle();

            if (appData && appData.id !== urlId) {
              setNameError({
                message: 'This app name already exists.',
                url: `/software/${appData.name.toLowerCase().replace(/\s+/g, '-')}`
              });
            } else {
              const { data: extData } = await (supabase.from('extensions') as any)
                .select('id, name')
                .ilike('name', currentName)
                .maybeSingle();

              if (extData && extData.id !== urlId) {
                setNameError({
                  message: 'This extension name already exists.',
                  url: `/extensions/${extData.name.toLowerCase().replace(/\s+/g, '-')}`
                });
              } else {
                setNameError(null);
              }
            }
          }
        } catch (err) {
          console.error("Duplicate check failed", err);
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    };

    checkDuplicates();
  }, [type === 'app' ? appForm.name : extForm.name]);

  const hasChanges = () => {
    if (urlMode !== 'edit' || !initialFormSnapshot) return true;
    const currentForm = type === 'app' ? appForm : extForm;
    const keys = type === 'app'
      ? ['name', 'slug', 'short_description', 'description', 'author', 'category', 'version', 'platforms', 'tags', 'content_types', 'repo_url', 'download_url', 'website_url', 'icon_url', 'icon_color', 'fork_of', 'upstream_url', 'social_urls', 'tutorials']
      : ['name', 'slug', 'short_description', 'description', 'author', 'category', 'language', 'platforms', 'tags', 'types', 'compatible_with', 'repo_url', 'source_url', 'icon_url', 'icon_color', 'install_urls', 'social_urls', 'tutorials'];

    for (const key of keys) {
      const valA = currentForm[key];
      const valB = initialFormSnapshot[key];

      if (typeof valA === 'object' || typeof valB === 'object') {
        if (JSON.stringify(valA) !== JSON.stringify(valB)) {
          return true;
        }
      } else {
        if ((valA || '') !== (valB || '')) {
          return true;
        }
      }
    }
    return false;
  };

  async function handleSubmit() {
    const form = type === 'app' ? appForm : extForm;
    if (!form.name || (type === 'app' && !appForm.author)) {
      return toast.error("Please fill in all required fields (Name for extensions, Name & Author for apps)");
    }
    if (!turnstileToken) {
      return toast.error("Please complete the CAPTCHA");
    }

    if (nameError) {
      return toast.error("Please resolve duplicate warnings before submitting.");
    }

    if (Object.values(errors).some(v => !!v)) {
      return toast.error("Please fix duplicate entries before saving.");
    }

    if (urlMode === 'edit' && !hasChanges()) {
      return toast.error("No changes detected. Please modify the form before submitting.");
    }

    setSubmitting(true);
    try {
      let submittedData: any = {};

      if (type === 'app') {
        submittedData = {
          name: appForm.name,
          slug: appForm.slug || null,
          short_description: appForm.short_description || null,
          description: appForm.description || null,
          author: appForm.author || null,
          category: appForm.category || null,
          version: appForm.version || null,
          status: 'pending',
          platforms: appForm.platforms.length ? appForm.platforms : null,
          tags: appForm.tags.length ? appForm.tags : null,
          // @ts-ignore
          content_types: appForm.content_types.length ? appForm.content_types : null,
          repo_url: appForm.repo_url || null,
          download_url: appForm.download_url || null,
          website_url: appForm.website_url || null,
          icon_url: appForm.icon_url || null,
          icon_color: appForm.icon_color || null,
          fork_of: appForm.fork_of || null,
          upstream_url: appForm.upstream_url || null,
          social_urls: appForm.social_urls.filter((u: string) => u.trim()) || [],
          discord_url: appForm.social_urls.filter((u: string) => u.trim())[0] || null,
          tutorials: appForm.tutorials,
          _selectedGroupIds: appForm._selectedGroupIds,
          _selectedGroupNames: appForm._selectedGroupNames,
        };
      } else {
        const validInstallUrls = extForm.install_urls.filter((u: InstallUrlEntry) => u.url.trim());
        const firstAuto = validInstallUrls.find((u: InstallUrlEntry) => u.type === 'auto');
        const firstCopy = validInstallUrls.find((u: InstallUrlEntry) => u.type === 'copy');

        submittedData = {
          name: extForm.name,
          slug: extForm.slug || null,
          short_description: extForm.short_description || null,
          description: extForm.description || null,
          author: extForm.author || null,
          category: extForm.category || null,
          language: extForm.language || null,
          status: 'pending',
          platforms: extForm.platforms.length ? extForm.platforms : null,
          tags: extForm.tags.length ? extForm.tags : null,
          // @ts-ignore
          types: extForm.types.length ? extForm.types : null,
          compatible_with: extForm.compatible_with.length ? extForm.compatible_with : null,
          repo_url: extForm.repo_url || null,
          source_url: extForm.source_url || null,
          icon_url: extForm.icon_url || null,
          icon_color: extForm.icon_color || null,
          auto_url: firstAuto?.url || null,
          manual_url: firstCopy?.url || null,
          metadata: { install_urls: validInstallUrls },
          social_urls: extForm.social_urls.filter((u: string) => u.trim()) || [],
          discord_url: extForm.social_urls.filter((u: string) => u.trim())[0] || null,
          tutorials: extForm.tutorials,
          _selectedGroupIds: extForm._selectedGroupIds,
          _selectedGroupNames: extForm._selectedGroupNames,
        };
      }

      let invokeFn = 'submit-content';
      let payload: any = {
        submissionType: type,
        submittedData,
        turnstileToken,
        submitterName: submitterForm.submitter_name,
        submitterContact: submitterForm.submitter_contact,
        submitterNotes: submitterForm.submitter_notes,
      };

      if (urlMode === 'edit' && urlId && originalDataSnapshot) {
        invokeFn = 'edit-suggestion';
        payload = {
          targetType: type,
          targetId: urlId,
          originalDataSnapshot,
          submittedData,
          turnstileToken,
          submitterName: submitterForm.submitter_name,
          submitterContact: submitterForm.submitter_contact,
          submitterNotes: submitterForm.submitter_notes,
          submitterUserId: undefined,
        };
      }

      const { data, error } = await supabase.functions.invoke(invokeFn, {
        body: payload
      });

      if (error) {
        const serverMsg = data?.error || error.message;
        throw new Error(serverMsg);
      }
      if (!data.success) {
        const detailMsg = data.details ? ` (${JSON.stringify(data.details)})` : '';
        throw new Error((data.error || "Submission failed") + detailMsg);
      }

      goTo(3);
      toast.success("Submission received!");
    } catch (err: any) {
      console.error(err);
      toast.error("Submission failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const renderSelection = () => (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in zoom-in-95 duration-500">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-transparent mb-4">
          What would you like to contribute?
        </h1>
        <p className="text-[var(--text-secondary)] text-lg">
          Help expand the library by submitting your favorite apps and extensions.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <button
          onClick={() => goTo(1, 'app')}
          className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--bg-elev-1)] to-[var(--bg-elev-2)] border border-[var(--divider)] p-8 text-left transition-all hover:border-[var(--brand)] hover:shadow-[0_0_40px_-10px_rgba(var(--brand-rgb),0.3)]"
        >
          <div className="relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center mb-6 text-3xl group-hover:scale-110 transition-transform duration-300">
              <Smartphone className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">New Application</h3>
            <p className="text-[var(--text-secondary)] mb-6">
              Submit a standalone application (Android, Windows, iOS, etc.) for anime, manga, or novel tracking/reading.
            </p>
            <div className="flex items-center text-[var(--brand)] font-semibold group-hover:translate-x-1 transition-transform">
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </div>
        </button>

        <button
          onClick={() => goTo(1, 'extension')}
          className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--bg-elev-1)] to-[var(--bg-elev-2)] border border-[var(--divider)] p-8 text-left transition-all hover:border-[var(--brand-secondary)] hover:shadow-[0_0_40px_-10px_rgba(168,85,247,0.3)]"
        >
          <div className="relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-6 text-3xl group-hover:scale-110 transition-transform duration-300">
              <Puzzle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">New Extension</h3>
            <p className="text-[var(--text-secondary)] mb-6">
              Any extension or plugin that enhances the app experience.
            </p>
            <div className="flex items-center text-purple-500 font-semibold group-hover:translate-x-1 transition-transform">
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </div>
        </button>
      </div>
    </div>
  );

  const renderGuidelines = () => (
    <div className="max-w-2xl mx-auto py-12 px-4 animate-in slide-in-from-right-8 duration-300">
      <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-8 text-center">Submission Guidelines</h2>

      <div className="bg-[var(--bg-elev-1)] border border-[var(--divider)] rounded-2xl p-8 space-y-6 mb-8">
        <div className="flex gap-4">
          <div className="mt-1"><Search className="w-5 h-5 text-blue-500" /></div>
          <div>
            <h4 className="font-semibold text-[var(--text-primary)]">1. Search Before Submitting</h4>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Search the directory before making a submission. Duplicate entries will be automatically rejected.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="mt-1"><Github className="w-5 h-5 text-purple-500" /></div>
          <div>
            <h4 className="font-semibold text-[var(--text-primary)]">2. Open-Source Preferred</h4>
            <p className="text-sm text-[var(--text-secondary)] mt-1">We prioritize open-source projects with functional code repositories. Closed-source apps are only considered if they are highly popular, widely requested, and loved by the community.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="mt-1"><Link className="w-5 h-5 text-green-500" /></div>
          <div>
            <h4 className="font-semibold text-[var(--text-primary)]">3. Valid & Official Links</h4>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Double-check all URLs (Download, Website, Socials). Links must direct straight to the project's official landing page or repository. We strictly forbid malware, viruses, or links routing through sketchy third-party redirect chains.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="mt-1"><CheckCircle2 className="w-5 h-5 text-amber-500" /></div>
          <div>
            <h4 className="font-semibold text-[var(--text-primary)]">4. Functional & Documented</h4>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Submissions must be fully functional, easy to install without breaking device security, and accompanied by an English description or README. We do not accept "empty" repositories used just to host text, or random experimental code dumps with no clear utility.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-4 justify-center">
        <AdminButton variant="secondary" onClick={() => goTo(0)}>Back</AdminButton>
        <AdminButton onClick={() => goTo(2)}>I Understand, Proceed</AdminButton>
      </div>
    </div>
  );

  const renderForm = () => {
    const currentName = type === 'app' ? appForm.name : extForm.name;
    const currentSlug = type === 'app' ? appForm.slug : extForm.slug;
    const targetRoute = type === 'app' ? 'software' : 'extensions';

    return (
      <div className="max-w-5xl mx-auto pb-8 px-4 animate-in slide-in-from-bottom-8 duration-500">

        <div className="flex items-center mb-6">
          <BackButton
            onClick={() => {
              if (urlMode === 'edit') {
                navigate(`/${targetRoute}/${currentSlug || urlId}`);
              } else {
                goTo(1);
              }
            }}
            label={urlMode === 'edit' ? `Back to ${currentName || (type === 'app' ? 'Software' : 'Extension')}` : `Back`}
          />
        </div>

        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {urlMode === 'edit' ? `Suggest Edit for ${type === 'app' ? 'App' : 'Extension'}` : `Submit ${type === 'app' ? 'App' : 'Extension'}`}
          </h1>
        </div>

        {urlMode === 'edit' && (
          <div className="mb-6 p-4 rounded-xl border border-[var(--divider)] bg-[var(--brand)]/10 text-[var(--text-primary)] flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[var(--brand)] shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-[var(--brand)]">Editing an existing {type}</p>
              <p className="text-[var(--text-secondary)] mt-1">
                You are currently submitting an edit suggestion. If you want to add a completely new {type === 'app' ? 'app' : 'extension'} instead, please go to the <button onClick={() => goTo(0)} className="text-[var(--brand)] hover:underline font-medium">Contribute page</button>.
              </p>
            </div>
          </div>
        )}

        {loadingInitial ? (
          <div className="py-20 flex flex-col justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--brand)] mb-4" />
            <p className="text-[var(--text-secondary)]">Loading existing data...</p>
          </div>
        ) : (
          <>
            {nameError && (
              <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold">{nameError.message}</p>
                  {nameError.url && (
                    <p className="mt-1">
                      <a href={nameError.url} target="_blank" rel="noreferrer" className="underline font-medium hover:text-red-400">
                        View Existing Profile
                      </a>
                    </p>
                  )}
                </div>
              </div>
            )}

            {type === 'app' ? (
              <SharedAppForm
                form={appForm}
                setForm={setAppForm}
                errors={errors}
                setErrors={setErrors}
                isAdmin={false}
              />
            ) : (
              <SharedExtensionForm
                form={extForm}
                setForm={setExtForm}
                errors={errors}
                setErrors={setErrors}
                isAdmin={false}
              />
            )}

            <div className="mt-8 mx-auto space-y-6">
              <div className="p-6 rounded-2xl border border-[var(--divider)] bg-[var(--bg-surface)] space-y-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" /> Your Details
                </h3>
                <p className="text-xs text-[var(--text-secondary)] -mt-2 mb-2">Used for clarification only. Not published.</p>
                <AdminFormField label="Your Name (Optional)">
                  <AdminInput
                    value={submitterForm.submitter_name} onChange={e => setSubmitterForm(f => ({ ...f, submitter_name: e.target.value }))}
                    placeholder="Nickname"
                  />
                </AdminFormField>
                <AdminFormField label="Contact (Telegram/Email)">
                  <AdminInput
                    value={submitterForm.submitter_contact} onChange={e => setSubmitterForm(f => ({ ...f, submitter_contact: e.target.value }))}
                    placeholder="@username or email"
                  />
                </AdminFormField>
                <AdminFormField label="Notes for Admin">
                  <AdminTextarea
                    value={submitterForm.submitter_notes} onChange={e => setSubmitterForm(f => ({ ...f, submitter_notes: e.target.value }))}
                    className="h-24"
                    placeholder="Any additional notes, context, or special requests for the admin team..."
                  />
                  <p className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-1">
                    <StickyNote className="w-3 h-3" /> Visible only to admins during review.
                  </p>
                </AdminFormField>
              </div>

              <div className="space-y-4 pt-4">
                {!loadingConfig && import.meta.env.VITE_DISABLE_TURNSTILE !== 'true' && (
                  <div className="pt-4 flex justify-center">
                    <Turnstile
                      sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
                      onVerify={(token) => setTurnstileToken(token)}
                      theme="auto"
                    />
                  </div>
                )}

                <AdminButton
                  onClick={handleSubmit}
                  disabled={submitting || (import.meta.env.VITE_DISABLE_TURNSTILE !== 'true' && !turnstileToken) || loadingInitial || !!nameError || (urlMode === 'edit' && !hasChanges())}
                  className="w-full py-4 text-base shadow-lg shadow-brand/20"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                  {urlMode === 'edit'
                    ? (hasChanges() ? 'Submit Edit Suggestion' : 'No changes to submit')
                    : 'Submit for Review'}
                </AdminButton>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderSuccess = () => (
    <div className="max-w-xl mx-auto py-20 px-4 text-center animate-in zoom-in-95 duration-500">
      <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-12 h-12" />
      </div>
      <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">Submission Received!</h2>
      <p className="text-[var(--text-secondary)] text-lg mb-8">
        Thank you for contributing to the library. Your submission has been queued for review by our moderators.
      </p>
      <div className="flex justify-center gap-4">
        <AdminButton variant="secondary" onClick={() => { goTo(0, null); }}>
          Submit Another
        </AdminButton>
        <AdminButton onClick={() => navigate('/')}>
          Return Home
        </AdminButton>
      </div>
    </div>
  );

  const renderDisabled = () => (
    <div className="max-w-xl mx-auto py-20 px-4 text-center animate-in zoom-in-95 duration-500">
      <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
        <AlertTriangle className="w-12 h-12" />
      </div>
      <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">Feature Disabled</h2>
      <p className="text-[var(--text-secondary)] text-lg mb-8">
        {disabledReason}
      </p>
      <div className="flex justify-center gap-4">
        <AdminButton variant="secondary" onClick={() => navigate(-1)}>
          Go Back
        </AdminButton>
        <AdminButton onClick={() => navigate('/')}>
          Return Home
        </AdminButton>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-default)]">
      <div
        className="pb-12 sm:pt-24"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 16px) + 16px)' }}
      >
        {!enabled ? (
          renderDisabled()
        ) : (
          <>
            {step === 0 && urlMode !== 'edit' && renderSelection()}
            {step === 1 && urlMode !== 'edit' && renderGuidelines()}
            {step === 2 && renderForm()}
            {step === 3 && renderSuccess()}
          </>
        )}
      </div>
    </div>
  );
}
