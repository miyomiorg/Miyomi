import { useCallback } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { UAParser } from 'ua-parser-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hash an IP address using SHA-256 (Web Crypto API).
 * Returns a hex string. The hash is one-way — it can be compared
 * but never reversed back to the original IP.
 */
async function hashIP(ip: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(ip);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function gatherDeviceInfo() {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    const fingerprint = result.visitorId;

    const parser = new UAParser();
    const ua = parser.getResult();

    // Fetch IP address and hash it immediately — never store or send raw IP
    let ipHash = '';
    try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const { ip } = await ipResponse.json();
        if (ip) {
            ipHash = await hashIP(ip);
        }
    } catch {
        // Fallback hash if ipify is blocked
        ipHash = await hashIP(fingerprint);
    }

    return {
        fingerprint,
        ua,
        ipHash,
        country: null,
        city: null,
    };
}

export function useSessionTracker() {
    const trackSession = useCallback(async (sessionType: 'login' | 'logout') => {
        try {
            const { fingerprint, ua, ipHash, country, city } = await gatherDeviceInfo();

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: admin } = await supabase
                .from('admins')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (!admin) return;

            await supabase.from('admin_sessions').insert({
                admin_id: admin.id,
                session_type: sessionType,
                ip_address: ipHash,
                user_agent: navigator.userAgent,
                browser: ua.browser.name || null,
                browser_version: ua.browser.version || null,
                os: ua.os.name || null,
                os_version: ua.os.version || null,
                device_type: ua.device.type || 'desktop',
                device_vendor: ua.device.vendor || null,
                device_model: ua.device.model || null,
                device_fingerprint: fingerprint,
                country,
                city,
            });
        } catch (error) {
            console.error('Session tracking error:', error);
        }
    }, []);

    const trackUnauthorizedAttempt = useCallback(async (email: string, provider: string) => {
        try {
            const { fingerprint, ua, ipHash, country, city } = await gatherDeviceInfo();

            // Get the Supabase project URL for the edge function
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
            const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

            // Call security-alert edge function (handles both DB logging and Telegram)
            // Send the hashed IP — never the raw IP
            await fetch(`${supabaseUrl}/functions/v1/security-alert`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                },
                body: JSON.stringify({
                    email,
                    auth_provider: provider,
                    ip_address: ipHash,
                    user_agent: navigator.userAgent,
                    browser: ua.browser.name || null,
                    browser_version: ua.browser.version || null,
                    os: ua.os.name || null,
                    os_version: ua.os.version || null,
                    device_type: ua.device.type || 'desktop',
                    device_fingerprint: fingerprint,
                    country,
                    city,
                    timestamp: new Date().toISOString(),
                }),
            });
        } catch (error) {
            console.error('Unauthorized attempt tracking error:', error);
            // Don't throw - tracking should not interrupt the redirect flow
        }
    }, []);

    return { trackSession, trackUnauthorizedAttempt };
}
