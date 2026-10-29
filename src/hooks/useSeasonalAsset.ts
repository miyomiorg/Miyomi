import { useContext, useMemo } from 'react';
import { ThemeEngineContext } from './useThemeEngine';

/**
 * Returns the appropriate asset (logo, avatar) based on the active theme.
 * Falls back to the defaultAsset if no theme is active or the asset key isn't defined.
 */
export function useSeasonalAsset(
    assetKey: 'logo' | 'homeAvatar',
    defaultAsset: string
): string {
    // useContext directly (null outside the provider) instead of a throwing
    // hook wrapped in try/catch.
    const themeAssets = useContext(ThemeEngineContext)?.themeAssets ?? null;

    return useMemo(
        () => themeAssets?.[assetKey] || defaultAsset,
        [themeAssets, assetKey, defaultAsset],
    );
}
