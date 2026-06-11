import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef, type PropsWithChildren } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, Json } from '@/integrations/supabase/types';
import { SEASONAL_CONFIG, isSeasonalActive } from '@/config/seasonal';

// ── Types ──────────────────────────────────────────────────────────
export type ThemeMode = 'auto' | 'manual' | 'off';

export interface ParticleConfig {
    type: 'snow' | 'sakura' | 'leaves' | 'rain' | 'none';
    count: number;
    speed: [number, number];
    wind: [number, number];
    colors: string[];
    lowPower?: { count: number };
}

export interface ThemeAssets {
    logo?: string;
    homeAvatar?: string;
    previewImage?: string;
}

export interface ThemeCssVariables {
    [key: string]: string | { [key: string]: string };
}

export interface ThemeRecord {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    is_seasonal: boolean;
    active_from: string | null;
    active_to: string | null;
    css_variables: ThemeCssVariables | null;
    particle_config: ParticleConfig | null;
    assets: ThemeAssets | null;
    preview_image: string | null;
    created_at: string;
    updated_at: string;
}

export interface ThemeEngineState {
    themes: ThemeRecord[];
    activeTheme: ThemeRecord | null;
    themeMode: ThemeMode;
    isLoading: boolean;
    particleConfig: ParticleConfig | null;
    themeAssets: ThemeAssets | null;
    activateTheme: (themeId: string) => Promise<void>;
    deactivateTheme: (themeId: string) => Promise<void>;
    setThemeMode: (mode: ThemeMode) => Promise<void>;
    refetch: () => Promise<void>;
}

// ── Defaults ───────────────────────────────────────────────────────
const CHRISTMAS_PARTICLE_CONFIG: ParticleConfig = {
    type: 'snow',
    count: SEASONAL_CONFIG.effects.snowCount,
    speed: [0.3, 1.0],
    wind: SEASONAL_CONFIG.effects.wind,
    colors: ['#FFFFFF', '#E0F2FE', '#BAE6FD'],
    lowPower: { count: SEASONAL_CONFIG.effects.lowPower.snowCount },
};

const SAKURA_PARTICLE_CONFIG: ParticleConfig = {
    type: 'sakura',
    count: 18,
    speed: [0.4, 1.2],
    wind: [-0.3, 0.8],
    colors: ['#FFB7C5', '#FF69B4', '#FFC0CB', '#FFD1DC', '#F8C8DC'],
    lowPower: { count: 8 },
};

const FALLBACK_THEMES: ThemeRecord[] = [
    {
        id: 'fallback-christmas',
        name: 'Winter Wonderland',
        slug: 'christmas',
        is_active: true,
        is_seasonal: true,
        active_from: '2025-11-15',
        active_to: '2026-02-28',
        css_variables: null,
        particle_config: CHRISTMAS_PARTICLE_CONFIG,
        assets: {
            logo: '/hugme-christmas.png',
            homeAvatar: '/polic-christmas.png',
        },
        preview_image: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'fallback-sakura',
        name: 'Sakura Spring',
        slug: 'sakura',
        is_active: false,
        is_seasonal: true,
        active_from: '2026-03-01',
        active_to: '2026-05-31',
        css_variables: null,
        particle_config: SAKURA_PARTICLE_CONFIG,
        assets: {
            logo: '/hugme-sakura.png',
            homeAvatar: '/polic-sakura.png',
        },
        preview_image: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
];

// ── Storage keys ───────────────────────────────────────────────────
const THEME_MODE_KEY = 'miyomi-theme-mode';
const ACTIVE_THEME_KEY = 'miyomi-active-theme-slug';

// ── Date helpers ───────────────────────────────────────────────────
function isDateInRange(from: string | null, to: string | null): boolean {
    if (!from || !to) return false;
    const now = new Date();
    // Compare only month-day to allow year-agnostic seasonal ranges
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const fromMonth = fromDate.getMonth() + 1;
    const fromDay = fromDate.getDate();
    const toMonth = toDate.getMonth() + 1;
    const toDay = toDate.getDate();

    const current = currentMonth * 100 + currentDay;
    const start = fromMonth * 100 + fromDay;
    const end = toMonth * 100 + toDay;

    // Handle wrapping (e.g., Nov 15 → Feb 28)
    if (start <= end) {
        return current >= start && current <= end;
    } else {
        return current >= start || current <= end;
    }
}

function parseJsonField<T>(val: Json | null | undefined, fallback: T): T {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'object') return val as unknown as T;
    if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return fallback; }
    }
    return fallback;
}

function mapTableToTheme(row: Tables<'themes'>): ThemeRecord {
    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        is_active: row.is_active,
        is_seasonal: row.is_seasonal,
        active_from: row.active_from,
        active_to: row.active_to,
        css_variables: parseJsonField<ThemeCssVariables | null>(row.css_variables, null),
        particle_config: parseJsonField<ParticleConfig | null>(row.particle_config, null),
        assets: parseJsonField<ThemeAssets | null>(row.assets, null),
        preview_image: (row as any).preview_image ?? null,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

// ── Resolve active theme ───────────────────────────────────────────
function resolveActiveTheme(themes: ThemeRecord[], mode: ThemeMode): ThemeRecord | null {
    if (mode === 'off') return null;

    const explicitlyActive = themes.find(t => t.is_active);
    if (explicitlyActive) return explicitlyActive;

    if (mode === 'auto') {
        const seasonalMatch = themes.find(
            t => t.is_seasonal && isDateInRange(t.active_from, t.active_to)
        );
        return seasonalMatch ?? null;
    }

    return null;
}

// ── Hook ───────────────────────────────────────────────────────────
export function useThemeEngine(colorMode: 'light' | 'dark' = 'light'): ThemeEngineState {
    const [themes, setThemes] = useState<ThemeRecord[]>([]);
    const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
        try {
            return (localStorage.getItem(THEME_MODE_KEY) as ThemeMode) || 'auto';
        } catch { return 'auto'; }
    });
    const [isLoading, setIsLoading] = useState(true);
    const prevAppliedVarsRef = useRef<string[]>([]);

    const fetchThemes = useCallback(async () => {
        try {
            if (!supabase) {
                console.warn('[ThemeEngine] Supabase is not initialized. Using fallback themes.');
                setThemes(FALLBACK_THEMES);
                setIsLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('themes')
                .select('*')
                .order('name');

            if (error || !data) {
                console.warn('[ThemeEngine] Using fallback themes:', error?.message);
                setThemes(FALLBACK_THEMES);
                return;
            }

            setThemes(data.map(mapTableToTheme));
        } catch (err) {
            console.warn('[ThemeEngine] Fetch failed, using fallbacks:', err);
            setThemes(FALLBACK_THEMES);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchThemes(); }, [fetchThemes]);

    useEffect(() => {
        if (!supabase) return;

        const channel = supabase
            .channel('theme-engine-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'themes' },
                () => {
                    console.log('[ThemeEngine] Theme update detected, refetching...');
                    fetchThemes();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchThemes]);

    const activeTheme = useMemo(
        () => resolveActiveTheme(themes, themeMode),
        [themes, themeMode]
    );

    const particleConfig = useMemo(
        () => activeTheme?.particle_config ?? null,
        [activeTheme]
    );

    const themeAssets = useMemo(
        () => activeTheme?.assets ?? null,
        [activeTheme]
    );

    useEffect(() => {
        const root = document.documentElement;

        themes.forEach(t => root.classList.remove(t.slug));
        FALLBACK_THEMES.forEach(t => root.classList.remove(t.slug));

        prevAppliedVarsRef.current.forEach(key => root.style.removeProperty(key));
        prevAppliedVarsRef.current = [];

        if (activeTheme) {
            root.classList.add(activeTheme.slug);

            if (activeTheme.css_variables) {
                const vars = activeTheme.css_variables;
                const targetVars = (vars as any)[colorMode] || vars;
                const appliedKeys: string[] = [];

                Object.entries(targetVars).forEach(([key, value]) => {
                    if (typeof value === 'string') {
                        const prop = key.startsWith('--') ? key : `--${key}`;
                        root.style.setProperty(prop, value);
                        appliedKeys.push(prop);
                    }
                });
                prevAppliedVarsRef.current = appliedKeys;
            }

            try {
                localStorage.setItem(ACTIVE_THEME_KEY, activeTheme.slug);
                if (activeTheme.css_variables) {
                    localStorage.setItem('miyomi-theme-cache', JSON.stringify(activeTheme.css_variables));
                }
            } catch { }
        } else {
            try {
                localStorage.removeItem(ACTIVE_THEME_KEY);
                localStorage.removeItem('miyomi-theme-cache');
            } catch { }
        }
    }, [activeTheme, themes, colorMode]);

    const activateTheme = useCallback(async (themeId: string) => {
        setIsLoading(true);
        if (supabase) {
            await supabase.from('themes').update({ is_active: false }).eq('is_active', true);
            await supabase.from('themes').update({ is_active: true }).eq('id', themeId);
        }
        await fetchThemes();
    }, [fetchThemes]);

    const deactivateTheme = useCallback(async (themeId: string) => {
        setIsLoading(true);
        if (supabase) {
            await supabase.from('themes').update({ is_active: false }).eq('id', themeId);
        }
        await fetchThemes();
    }, [fetchThemes]);

    const setThemeMode = useCallback(async (mode: ThemeMode) => {
        setThemeModeState(mode);
        try { localStorage.setItem(THEME_MODE_KEY, mode); } catch { }
    }, []);

    return {
        themes,
        activeTheme,
        themeMode,
        isLoading,
        particleConfig,
        themeAssets,
        activateTheme,
        deactivateTheme,
        setThemeMode,
        refetch: fetchThemes,
    };
}

// ── Context ────────────────────────────────────────────────────────
const ThemeEngineContext = createContext<ThemeEngineState | null>(null);

export { ThemeEngineContext };

export function useThemeEngineContext(): ThemeEngineState {
    const ctx = useContext(ThemeEngineContext);
    if (!ctx) {
        throw new Error('useThemeEngineContext must be used within a ThemeEngineProvider');
    }
    return ctx;
}
