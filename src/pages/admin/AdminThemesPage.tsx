import { useState, useMemo } from 'react';
import { Palette, Plus, ChevronDown, ChevronUp, Sparkles, Snowflake, Leaf, Cherry, Settings, CloudRain, Pencil, Trash2, Save, FileJson, Copy } from 'lucide-react';
import { AdminButton, AdminInput, AdminFormField, AdminSelect, StatusBadge, EmptyState, AdminTextarea } from '@/components/admin/AdminFormElements';
import { useThemeEngineContext, type ThemeMode, type ParticleConfig, type ThemeAssets, type ThemeCssVariables, type ThemeRecord } from '@/hooks/useThemeEngine';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s / 100 * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l / 100 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function generatePalette(brandHex: string) {
  const { h, s, l } = hexToHSL(brandHex);

  return {
    light: {
      '--background': hslToHex(h, Math.max(s - 30, 2), 98),
      '--foreground': '#0f172a',

      '--card': '#ffffff',
      '--card-foreground': '#0f172a',

      '--popover': '#ffffff',
      '--popover-foreground': '#0f172a',

      '--primary': brandHex,
      '--primary-foreground': '#ffffff',

      '--secondary': hslToHex(h, Math.max(s - 20, 10), 96),
      '--secondary-foreground': hslToHex(h, Math.min(s + 10, 100), 20),

      '--muted': hslToHex(h, Math.max(s - 20, 5), 96),
      '--muted-foreground': '#64748b',

      '--accent': hslToHex(h, Math.max(s - 20, 10), 96),
      '--accent-foreground': '#0f172a',

      '--destructive': '#ef4444',
      '--destructive-foreground': '#ffffff',

      '--border': hslToHex(h, Math.max(s - 20, 10), 90),
      '--input': hslToHex(h, Math.max(s - 20, 10), 90),
      '--ring': brandHex,

      '--bg-page': hslToHex(h, Math.max(s - 30, 2), 98),
      '--bg-surface': '#ffffff',
      '--bg-elev-1': hslToHex(h, Math.max(s - 20, 10), 96),
      '--text-primary': '#0f172a',
      '--text-secondary': '#475569',
      '--brand': brandHex,
      '--brand-strong': hslToHex(h, Math.min(s + 10, 100), Math.max(l - 10, 30)),
      '--divider': hslToHex(h, Math.max(s - 20, 5), 92),
      '--bg-glass': `rgba(255, 255, 255, 0.7)`,
      '--glass-border': `rgba(255, 255, 255, 0.5)`,
    },
    dark: {
      '--background': hslToHex(h, Math.max(s - 10, 20), 5),
      '--foreground': '#f8fafc',

      '--card': `hsla(${h}, ${Math.max(s - 20, 15)}%, 10%, 0.8)`,
      '--card-foreground': '#f8fafc',

      '--popover': `hsla(${h}, ${Math.max(s - 20, 15)}%, 10%, 0.9)`,
      '--popover-foreground': '#f8fafc',

      '--primary': hslToHex(h, Math.min(s + 5, 90), 60),
      '--primary-foreground': '#020617',

      '--secondary': `hsla(${h}, ${Math.max(s - 20, 20)}%, 15%, 1)`,
      '--secondary-foreground': '#f8fafc',

      '--muted': `hsla(${h}, ${Math.max(s - 20, 20)}%, 15%, 1)`,
      '--muted-foreground': '#94a3b8',

      '--accent': `hsla(${h}, ${Math.max(s - 20, 20)}%, 20%, 1)`,
      '--accent-foreground': '#f8fafc',

      '--destructive': '#991b1b',
      '--destructive-foreground': '#f8fafc',

      '--border': `hsla(${h}, ${Math.max(s - 30, 20)}%, 20%, 0.4)`,
      '--input': `hsla(${h}, ${Math.max(s - 30, 20)}%, 20%, 0.4)`,
      '--ring': hslToHex(h, Math.min(s + 5, 90), 60),

      '--bg-page': hslToHex(h, Math.max(s - 10, 20), 5),
      '--bg-surface': `hsla(${h}, ${Math.max(s - 20, 15)}%, 10%, 0.8)`,
      '--bg-elev-1': `hsla(${h}, ${Math.max(s - 20, 20)}%, 15%, 0.6)`,
      '--text-primary': '#f8fafc',
      '--text-secondary': '#94a3b8',
      '--brand': hslToHex(h, Math.min(s + 5, 90), 60),
      '--brand-strong': hslToHex(h, Math.min(s + 5, 90), 70),
      '--divider': `hsla(${h}, ${Math.max(s - 30, 10)}%, 30%, 0.3)`,
      '--bg-glass': `hsla(${h}, ${Math.max(s - 20, 20)}%, 10%, 0.6)`,
      '--glass-border': `hsla(${h}, ${s}%, 80%, 0.1)`,
    },
  };
}

function brandHexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

const particleIcons: Record<string, React.ReactNode> = {
  snow: <Snowflake className="w-4 h-4" />,
  sakura: <Cherry className="w-4 h-4" />,
  leaves: <Leaf className="w-4 h-4" />,
  rain: <CloudRain className="w-4 h-4" />,
  none: <span className="text-xs">—</span>,
};

function ColorDots({ theme }: { theme: ThemeRecord }) {
  const colors = useMemo(() => {
    const vars = theme.css_variables;
    if (!vars) {

      const presets: Record<string, string[]> = {
        christmas: ['#0ea5e9', '#bae6fd', '#0284c7', '#e0f2fe'],
        sakura: ['#EC4899', '#F9A8D4', '#DB2777', '#FCE7F3'],
        rainforest: ['#059669', '#34D399', '#065F46', '#D1FAE5'],
      };
      return presets[theme.slug] || ['#1d4ed8', '#38BDF8', '#F472B6'];
    }

    const targetVars = (vars as any).light || vars;
    return [targetVars['--brand'], targetVars['--brand-strong'], targetVars['--chip-bg'], targetVars['--border']].filter(Boolean);
  }, [theme]);

  return (
    <div className="flex items-center gap-1">
      {colors.map((c, i) => (
        <div
          key={i}
          className="w-4 h-4 rounded-full border"
          style={{ background: c, borderColor: 'var(--divider)' }}
          title={c}
        />
      ))}
    </div>
  );
}

function seasonEmoji(slug: string) {
  const map: Record<string, string> = {
    christmas: '❄️',
    sakura: '🌸',
    autumn: '🍂',
    summer: '☀️',
    halloween: '🎃',
    valentine: '💕',
  };
  return map[slug] || '🎨';
}

function LiveThemePreview({ palette, mode }: { palette: any; mode: 'light' | 'dark' }) {
  const vars = palette[mode];

  return (
    <div
      className="rounded-xl overflow-hidden border shadow-lg transition-all duration-300"
      style={{
        ...vars,
        background: 'var(--bg-page)',
        borderColor: 'var(--border)',
        color: 'var(--text-primary)',
      } as React.CSSProperties}
    >

      <div className="h-12 border-b flex items-center justify-between px-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--brand)', color: 'var(--primary-foreground)' }}>
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-bold">Miyomi</span>
        </div>
        <div className="flex gap-2">
          <div className="w-16 h-2 rounded-full" style={{ background: 'var(--bg-elev-1)' }} />
          <div className="w-8 h-8 rounded-full border" style={{ borderColor: 'var(--divider)' }} />
        </div>
      </div>


      <div className="p-5">
        <div className="h-4 w-1/3 rounded mb-4" style={{ background: 'var(--text-primary)', opacity: 0.1 }} />


        <div className="rounded-lg border p-4 mb-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h4 className="font-semibold text-sm mb-1" style={{ color: 'var(--card-foreground)' }}>Interactive Elements</h4>
          <p className="text-xs mb-3" style={{ color: 'var(--muted-foreground)' }}>Check how your colors interact.</p>

          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded-md text-xs font-medium" style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
              Primary Action
            </button>
            <button className="px-3 py-1.5 rounded-md text-xs font-medium border" style={{ background: 'var(--secondary)', color: 'var(--secondary-foreground)', borderColor: 'var(--border)' }}>
              Secondary
            </button>
          </div>
        </div>


        <div className="space-y-2">
          <div className="h-8 rounded-md border w-full" style={{ background: 'var(--input)', borderColor: 'var(--border)' }} />
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border" style={{ borderColor: 'var(--brand)' }} />
            <div className="h-2 w-20 rounded" style={{ background: 'var(--muted-foreground)', opacity: 0.3 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemePreview({ theme, isActive }: { theme: ThemeRecord; isActive: boolean }) {
  const [imgError, setImgError] = useState(false);
  const imageSrc = theme.preview_image || (theme.assets as any)?.homeAvatar;
  const showImage = imageSrc && !imgError;

  return (
    <div
      className="h-32 relative flex items-center justify-center overflow-hidden"
      style={{
        background: isActive
          ? 'linear-gradient(135deg, color-mix(in srgb, var(--brand) 20%, var(--bg-elev-1)), color-mix(in srgb, var(--brand) 5%, var(--bg-elev-1)))'
          : 'var(--bg-elev-1)',
      }}
    >
      {showImage ? (
        <img
          src={imageSrc}
          alt={theme.name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover opacity-90 transition-transform hover:scale-105"
        />
      ) : (
        <span className="text-5xl select-none">{seasonEmoji(theme.slug)}</span>
      )}

      {isActive && (
        <div className="absolute top-2 right-2">
          <StatusBadge active />
        </div>
      )}
    </div>
  );
}

export function AdminThemesPage() {
  const engine = useThemeEngineContext();
  const { themes, activeTheme, themeMode, activateTheme, deactivateTheme, setThemeMode, refetch } = engine;
  const [builderOpen, setBuilderOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [rawMode, setRawMode] = useState(false);
  const [rawJson, setRawJson] = useState('{\n  "light": {},\n  "dark": {}\n}');
  const [missingFields, setMissingFields] = useState<string[]>([]);


  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newBrand, setNewBrand] = useState('#EC4899');
  const [newSeasonal, setNewSeasonal] = useState(true);
  const [newActiveFrom, setNewActiveFrom] = useState('');
  const [newActiveTo, setNewActiveTo] = useState('');
  const [newParticleType, setNewParticleType] = useState<'snow' | 'sakura' | 'leaves' | 'rain' | 'none'>('none');


  const [manualOverrides, setManualOverrides] = useState<any>({});

  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light');


  const finalPalette = useMemo(() => {
    const base = generatePalette(newBrand);
    return {
      light: { ...base.light, ...(manualOverrides.light || {}) },
      dark: { ...base.dark, ...(manualOverrides.dark || {}) }
    };
  }, [newBrand, manualOverrides]);

  async function handleActivate(themeId: string) {
    setActivatingId(themeId);
    try {
      await activateTheme(themeId);
      toast.success('Theme activated!');
    } catch (err) {
      toast.error('Failed to activate theme');
    } finally {
      setActivatingId(null);
    }
  }

  async function handleDeactivate(themeId: string) {
    setActivatingId(themeId);
    try {
      await deactivateTheme(themeId);
      toast.success('Theme deactivated');
    } catch (err) {
      toast.error('Failed to deactivate theme');
    } finally {
      setActivatingId(null);
    }
  }

  async function handleDelete(themeId: string, themeName: string) {
    if (!confirm(`Are you sure you want to delete "${themeName}"? This cannot be undone.`)) return;

    setActivatingId(themeId);
    try {
      const { error } = await supabase.from('themes').delete().eq('id', themeId);
      if (error) throw error;
      toast.success(`Theme "${themeName}" deleted`);
      await refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete theme');
    } finally {
      setActivatingId(null);
    }
  }

  function handleEdit(theme: ThemeRecord) {
    setEditingId(theme.id);
    setNewName(theme.name);
    setNewSlug(theme.slug);

    const vars = theme.css_variables as any;
    const brand = vars?.light?.['--brand'] || vars?.['--brand'] || '#EC4899';
    setNewBrand(brand);

    if (vars && vars.light && vars.dark) {
      setManualOverrides(vars);
      setRawJson(JSON.stringify(vars, null, 2));
    } else {
      setManualOverrides({});
      setRawJson('{\n  "light": {},\n  "dark": {}\n}');
    }

    setNewSeasonal(theme.is_seasonal);
    setNewActiveFrom(theme.active_from || '');
    setNewActiveTo(theme.active_to || '');

    const pType = theme.particle_config?.type || 'none';
    setNewParticleType(pType as any);

    setBuilderOpen(true);
    document.getElementById('theme-builder')?.scrollIntoView({ behavior: 'smooth' });
  }

  function resetForm() {
    setNewName('');
    setNewSlug('');
    setNewBrand('#EC4899');
    setNewSeasonal(true);
    setNewActiveFrom('');
    setNewActiveTo('');
    setNewParticleType('none');
    setManualOverrides({});
    setRawJson('{\n  "light": {},\n  "dark": {}\n}');
    setRawMode(false);
    setMissingFields([]);
    setEditingId(null);
    setBuilderOpen(false);
  }

  function updateOverride(mode: 'light' | 'dark', key: string, value: string) {
    setManualOverrides((prev: any) => ({
      ...prev,
      [mode]: {
        ...(prev[mode] || {}),
        [key]: value
      }
    }));
  }

  const EXPECTED_KEYS = [
    '--background', '--foreground', '--card', '--card-foreground', '--popover', '--popover-foreground',
    '--primary', '--primary-foreground', '--secondary', '--secondary-foreground', '--muted', '--muted-foreground',
    '--accent', '--accent-foreground', '--destructive', '--destructive-foreground', '--border', '--input', '--ring',
    '--bg-page', '--bg-surface', '--bg-elev-1', '--text-primary', '--text-secondary', '--brand', '--brand-strong',
    '--divider', '--bg-glass', '--glass-border'
  ];

  function handleCopyAIContext() {
    const AI_CONTEXT_PROMPT = `You are an expert UI/UX designer. I need a JSON color palette for a theme named "${newName || '[THEME NAME]'}".
The palette must have "light" and "dark" modes.
Each mode needs the following CSS variables defined as valid CSS color strings (hex, rgb, rgba, hsl, hsla):

${EXPECTED_KEYS.join(', ')}

Output ONLY valid JSON matching this exact structure:
{
  "light": {
    "--background": "...",
    ...
  },
  "dark": {
    "--background": "...",
    ...
  }
}`;
    navigator.clipboard.writeText(AI_CONTEXT_PROMPT);
    toast.success('AI Context copied to clipboard!');
  }

  function handleApplyRaw() {
    try {
      const parsed = JSON.parse(rawJson);
      if (!parsed.light || !parsed.dark) {
        toast.error('JSON must contain "light" and "dark" objects');
        return;
      }
      
      const missing: string[] = [];
      EXPECTED_KEYS.forEach(key => {
        if (!parsed.light[key] || !parsed.dark[key]) {
          missing.push(key);
        }
      });

      setManualOverrides(parsed);
      setMissingFields(missing);

      if (missing.length > 0) {
        toast.warning(`Missing ${missing.length} fields. Live preview might be incomplete.`);
      } else {
        toast.success('Raw JSON applied successfully!');
      }
    } catch (err: any) {
      toast.error('Invalid JSON: ' + err.message);
    }
  }

  function handleAutoFill() {
    const newJson = JSON.stringify(finalPalette, null, 2);
    setRawJson(newJson);
    setManualOverrides(finalPalette);
    setMissingFields([]);
    toast.success('Missing fields auto-filled with base palette!');
  }

  async function handleCreateTheme() {
    if (!newName.trim() || !newSlug.trim()) {
      toast.error('Name and slug are required');
      return;
    }

    setSaving(true);
    try {
      const particleConfig: ParticleConfig | null = newParticleType === 'none' ? null : {
        type: newParticleType,
        count: newParticleType === 'sakura' ? 18 : newParticleType === 'snow' ? 20 : newParticleType === 'rain' ? 40 : 15,
        speed: [0.4, 1.2],
        wind: [-0.3, 0.8],
        colors: newParticleType === 'sakura'
          ? ['#FFB7C5', '#FF69B4', '#FFC0CB', '#FFD1DC']
          : newParticleType === 'snow'
            ? ['#FFFFFF', '#E0F2FE', '#BAE6FD']
            : newParticleType === 'rain'
              ? ['#60A5FA', '#93C5FD', '#3B82F6', '#2563EB']
              : ['#D97706', '#F59E0B', '#92400E', '#B45309'],
        lowPower: { count: 8 },
      };

      const themeData = {
        name: newName.trim(),
        slug: newSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        is_seasonal: newSeasonal,
        is_active: editingId ? (themes.find(t => t.id === editingId)?.is_active ?? false) : false,
        active_from: newActiveFrom || null,
        active_to: newActiveTo || null,
        css_variables: finalPalette, // Use the Final Merged Palette
        particle_config: particleConfig,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase
          .from('themes')
          .update(themeData as any)
          .eq('id', editingId);
        if (error) throw error;
        toast.success(`Theme "${newName}" updated!`);
      } else {
        const { error } = await supabase
          .from('themes')
          .insert({
            ...themeData,
            assets: null,
          } as any);
        if (error) throw error;
        toast.success(`Theme "${newName}" created!`);
      }

      resetForm();
      await refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create theme');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold font-['Poppins',sans-serif]" style={{ color: 'var(--text-primary)' }}>
          🎨 Theme Engine
        </h1>

        {/* Mode Toggle */}
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Mode:</span>
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--divider)' }}>
            {(['auto', 'manual', 'off'] as ThemeMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setThemeMode(mode)}
                className="px-3 py-1.5 text-xs font-semibold capitalize transition-colors"
                style={{
                  background: themeMode === mode ? 'var(--brand)' : 'var(--bg-elev-1)',
                  color: themeMode === mode ? 'white' : 'var(--text-secondary)',
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Theme Banner */}
      {activeTheme && (
        <div
          className="rounded-xl p-4 mb-6 flex items-center gap-3 border"
          style={{ background: 'color-mix(in srgb, var(--brand) 8%, var(--bg-surface))', borderColor: 'color-mix(in srgb, var(--brand) 25%, var(--divider))' }}
        >
          <Sparkles className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--brand)' }} />
          <div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Active: {seasonEmoji(activeTheme.slug)} {activeTheme.name}
            </span>
            <span className="ml-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              ({themeMode === 'auto' ? 'Auto-selected by date range' : 'Manually activated'})
            </span>
          </div>
        </div>
      )}

      {/* Theme Cards Grid */}
      {themes.length === 0 ? (
        <EmptyState icon={Palette} title="No themes configured" description="Create your first theme using the builder below" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
          {themes.map(theme => {
            const isActive = activeTheme?.id === theme.id;
            const isLoading = activatingId === theme.id;

            return (
              <div
                key={theme.id}
                className="rounded-2xl border overflow-hidden transition-all hover:shadow-lg"
                style={{
                  background: 'var(--bg-surface)',
                  borderColor: isActive ? 'var(--brand)' : 'var(--divider)',
                  boxShadow: isActive ? '0 0 0 2px color-mix(in srgb, var(--brand) 20%, transparent)' : undefined,
                }}
              >
                {/* Preview Image Area */}
                <ThemePreview theme={theme} isActive={isActive} />

                {/* Card Body */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                      {theme.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                      style={{
                        background: theme.is_seasonal
                          ? 'color-mix(in srgb, #6366F1 12%, transparent)'
                          : 'color-mix(in srgb, #10B981 12%, transparent)',
                        color: theme.is_seasonal ? '#6366F1' : '#10B981',
                      }}>
                      {theme.is_seasonal ? 'Seasonal' : 'Permanent'}
                    </span>
                  </div>

                  {/* Color palette dots */}
                  <div className="mb-3">
                    <ColorDots theme={theme} />
                  </div>

                  {/* Particle type + date range */}
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    {theme.particle_config && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {particleIcons[(theme.particle_config as ParticleConfig).type] || particleIcons.none}
                        <span className="capitalize">{(theme.particle_config as ParticleConfig).type}</span>
                      </span>
                    )}
                    {theme.active_from && (
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        📅 {new Date(theme.active_from).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                        {' – '}
                        {theme.active_to ? new Date(theme.active_to).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '∞'}
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <AdminButton
                    variant={isActive ? 'destructive' : 'primary'}
                    className="w-full"
                    onClick={() => isActive ? handleDeactivate(theme.id) : handleActivate(theme.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing…' : isActive ? 'Deactivate' : 'Activate'}
                  </AdminButton>

                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => handleEdit(theme)}
                      className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors hover:bg-[var(--bg-elev-1)] flex items-center justify-center gap-1.5"
                      style={{ borderColor: 'var(--divider)', color: 'var(--text-secondary)' }}
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(theme.id, theme.name)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors hover:bg-red-50 hover:border-red-200 hover:text-red-600 flex items-center justify-center"
                      style={{ borderColor: 'var(--divider)', color: 'var(--text-secondary)' }}
                      title="Delete Theme"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Theme Builder */}
      <div
        id="theme-builder"
        className="rounded-2xl border overflow-hidden"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}
      >
        <button
          onClick={() => {
            if (editingId) resetForm(); // Close/Reset if editing
            else setBuilderOpen(!builderOpen);
          }}
          className="w-full p-4 flex items-center justify-between text-left transition-colors hover:opacity-80"
        >
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5" style={{ color: 'var(--brand)' }} />
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Theme Builder</span>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Create a new theme from a base color</span>
          </div>
          {builderOpen
            ? <ChevronUp className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            : <ChevronDown className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          }
        </button>

        {builderOpen && (
          <div className="p-5 pt-0 border-t" style={{ borderColor: 'var(--divider)' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
              {/* Left: Config inputs */}
              <div className="space-y-4">
                <AdminFormField label="Theme Name" required>
                  <AdminInput
                    value={newName}
                    onChange={e => {
                      setNewName(e.target.value);
                      if (!newSlug || newSlug === newName.toLowerCase().replace(/[^a-z0-9]+/g, '-')) {
                        setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                      }
                    }}
                    placeholder="e.g. Autumn Harvest"
                  />
                </AdminFormField>

                <AdminFormField label="Slug">
                  <AdminInput
                    value={newSlug}
                    onChange={e => setNewSlug(e.target.value)}
                    placeholder="e.g. autumn"
                  />
                </AdminFormField>

                <AdminFormField label="Brand Color">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={newBrand}
                      onChange={e => setNewBrand(e.target.value)}
                      className="w-12 h-10 rounded-lg border cursor-pointer"
                      style={{ borderColor: 'var(--divider)', background: 'var(--bg-elev-1)' }}
                    />
                    <AdminInput
                      value={newBrand}
                      onChange={e => setNewBrand(e.target.value)}
                      className="flex-1"
                      placeholder="#EC4899"
                    />
                  </div>
                </AdminFormField>

                <AdminFormField label="Particle Animation">
                  <AdminSelect
                    value={newParticleType}
                    onChange={e => setNewParticleType(e.target.value as any)}
                  >
                    <option value="none">None</option>
                    <option value="snow">❄️ Snow</option>
                    <option value="sakura">🌸 Sakura Petals</option>
                    <option value="leaves">🍂 Falling Leaves</option>
                    <option value="rain">🌧️ Rain</option>
                  </AdminSelect>
                </AdminFormField>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newSeasonal}
                      onChange={e => setNewSeasonal(e.target.checked)}
                      className="w-4 h-4 accent-[var(--brand)]"
                    />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Seasonal theme</span>
                  </label>
                </div>

                {newSeasonal && (
                  <div className="grid grid-cols-2 gap-3">
                    <AdminFormField label="Active From">
                      <AdminInput
                        type="date"
                        value={newActiveFrom}
                        onChange={e => setNewActiveFrom(e.target.value)}
                      />
                    </AdminFormField>
                    <AdminFormField label="Active To">
                      <AdminInput
                        type="date"
                        value={newActiveTo}
                        onChange={e => setNewActiveTo(e.target.value)}
                      />
                    </AdminFormField>
                  </div>
                )}
              </div>

              {/* Right: Granular Palette Editor */}
              <div className="md:col-span-1">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                      Palette Editor
                    </p>
                    <button
                      onClick={() => {
                        if (!rawMode && Object.keys(manualOverrides).length === 0) {
                           setRawJson(JSON.stringify(finalPalette, null, 2));
                        } else if (!rawMode) {
                           setRawJson(JSON.stringify(manualOverrides, null, 2));
                        }
                        setRawMode(!rawMode);
                      }}
                      className="px-2 py-1 text-[10px] uppercase font-bold rounded-md flex items-center gap-1 transition-colors"
                      style={{ 
                        background: rawMode ? 'var(--brand)' : 'var(--bg-elev-1)',
                        color: rawMode ? 'white' : 'var(--text-primary)'
                      }}
                    >
                      <FileJson className="w-3 h-3" /> {rawMode ? 'Visual Mode' : 'Raw JSON'}
                    </button>
                    <button
                      onClick={handleCopyAIContext}
                      className="px-2 py-1 text-[10px] uppercase font-bold rounded-md bg-[var(--brand)] text-white hover:opacity-90 transition-opacity flex items-center gap-1"
                      title="Copy context prompt for AI"
                    >
                      <Copy className="w-3 h-3" /> AI Context
                    </button>
                  </div>
                  {/* Toggle Light/Dark preview for editor */}
                  <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--divider)' }}>
                    <button
                      onClick={() => setPreviewMode('light')}
                      className="px-3 py-1 text-xs transition-colors"
                      style={{
                        background: previewMode === 'light' ? 'var(--brand)' : 'transparent',
                        color: previewMode === 'light' ? 'white' : 'var(--text-secondary)'
                      }}
                    >Light</button>
                    <button
                      onClick={() => setPreviewMode('dark')}
                      className="px-3 py-1 text-xs transition-colors"
                      style={{
                        background: previewMode === 'dark' ? 'var(--brand)' : 'transparent',
                        color: previewMode === 'dark' ? 'white' : 'var(--text-secondary)'
                      }}
                    >Dark</button>
                  </div>
                </div>

                {/* Live Preview Component */}
                <div className="mb-6">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-2" style={{ color: 'var(--text-secondary)' }}>Live UI Preview</h4>
                  <LiveThemePreview palette={finalPalette} mode={previewMode} />
                </div>

                <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {rawMode ? (
                    <div className="space-y-3">
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Paste your generated JSON here. Ensure it contains both <code>light</code> and <code>dark</code> keys.
                      </p>
                      <AdminTextarea
                        value={rawJson}
                        onChange={e => setRawJson(e.target.value)}
                        className="font-mono text-xs min-h-[300px]"
                        placeholder={'{\n  "light": { ... },\n  "dark": { ... }\n}'}
                      />
                      <div className="flex gap-2">
                        <AdminButton variant="secondary" onClick={handleApplyRaw} className="flex-1">
                          Apply JSON
                        </AdminButton>
                        {missingFields.length > 0 && (
                          <AdminButton variant="primary" onClick={handleAutoFill} className="flex-1 !bg-yellow-600 hover:!bg-yellow-700 !text-white border-none shadow-sm">
                            Auto-fill Missing
                          </AdminButton>
                        )}
                      </div>
                      {missingFields.length > 0 && (
                        <div className="text-[10px] text-yellow-700 bg-yellow-50 p-2 rounded-lg border border-yellow-200">
                          <strong>Missing fields:</strong> {missingFields.join(', ')}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Variable Editors */
                    <div>
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <span>{previewMode === 'light' ? '☀️ Light' : '🌙 Dark'} Mode Colors</span>
                      </h4>
                      <div className="grid grid-cols-1 gap-3">
                        {Object.entries(finalPalette[previewMode]).map(([key, val]) => (
                          <div key={key} className="flex items-center gap-3 group">
                            <div
                              className="w-8 h-8 rounded-lg border shadow-sm flex-shrink-0 relative overflow-hidden"
                              style={{ background: String(val), borderColor: 'var(--divider)' }}
                            >
                              <input
                                type="color"
                                value={String(val).startsWith('#') ? String(val) : '#000000'}
                                onChange={e => updateOverride(previewMode, key, e.target.value)}
                                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-mono font-medium truncate" style={{ color: 'var(--text-primary)' }}>{key}</p>
                              <p className="text-[10px] truncate opacity-70" style={{ color: 'var(--text-secondary)' }}>{String(val)}</p>
                            </div>
                            {((manualOverrides[previewMode] || {})[key]) && (
                              <button
                                onClick={() => {
                                  // Reset override for this key
                                  const newOverrides = { ...manualOverrides };
                                  if (newOverrides[previewMode]) delete newOverrides[previewMode][key];
                                  setManualOverrides(newOverrides);
                                }}
                                className="text-[10px] text-red-500 hover:underline"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t sticky bottom-0 bg-[var(--bg-surface)]" style={{ borderColor: 'var(--divider)' }}>
                  <AdminButton
                    variant="primary"
                    className="w-full"
                    onClick={handleCreateTheme}
                    disabled={saving || !newName.trim() || !newSlug.trim()}
                  >
                    {saving ? (editingId ? 'Saving…' : 'Creating…') : (
                      <span className="flex items-center justify-center gap-2">
                        {editingId ? <><Save className="w-4 h-4" /> Save Changes</> : <><Plus className="w-4 h-4" /> Create Theme</>}
                      </span>
                    )}
                  </AdminButton>

                  {editingId && (
                    <button
                      onClick={resetForm}
                      className="w-full mt-2 text-xs hover:underline text-center"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Cancel Editing
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
