const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function checkRateLimit(supabase: any, ip: string, endpointName: string, maxRequests: number, windowMs: number): Promise<boolean> {
  const hashedIp = await hashIP(ip);
  const key = `${endpointName}:${hashedIp}`;
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (entry && now <= entry.resetAt && entry.count >= maxRequests) {
    return true;
  }

  try {
    const windowStart = new Date(now - windowMs).toISOString();
    const { count, error: countError } = await supabase
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', hashedIp)
      .eq('endpoint', endpointName)
      .gte('window_start', windowStart);

    if (countError) throw countError;

    if (count !== null && count >= maxRequests) {
      rateLimitMap.set(key, { count: count + 1, resetAt: now + windowMs });
      return true;
    }

    const { error: insertError } = await supabase
      .from('rate_limits')
      .insert({ ip_address: hashedIp, endpoint: endpointName, window_start: new Date(now).toISOString() });

    if (insertError) throw insertError;

    rateLimitMap.set(key, { count: (count || 0) + 1, resetAt: now + windowMs });
    return false;
  } catch (error) {
    console.error(`Rate limit error for ${endpointName}:`, error);
    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return false;
    }
    if (entry.count >= maxRequests) return true;
    entry.count++;
    return false;
  }
}

export async function verifyTurnstile(token: string | undefined): Promise<{ success: boolean; error?: string }> {
  const disableTurnstile = Deno.env.get("DISABLE_TURNSTILE") === "true";
  if (disableTurnstile) return { success: true };

  if (!token) {
    return { success: false, error: "CAPTCHA verification required" };
  }

  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!turnstileSecret) {
    return { success: false, error: "Server CAPTCHA configuration error" };
  }

  const formData = new FormData();
  formData.append("secret", turnstileSecret);
  formData.append("response", token);

  try {
    const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      body: formData,
      method: "POST",
    });

    const outcome = await result.json();
    if (!outcome.success) {
      return { success: false, error: "CAPTCHA verification failed" };
    }
    return { success: true };
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return { success: false, error: "Failed to verify CAPTCHA" };
  }
}

export async function checkEndpointEnabled(supabase: any, endpointKey: string): Promise<{ enabled: boolean; reason: string }> {
  try {
    const { data: enabledData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', `${endpointKey}_enabled`)
      .single();

    const { data: reasonData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', `${endpointKey}_disabled_reason`)
      .single();

    const enabled = enabledData?.value !== false && enabledData?.value !== "false";
    const reason = reasonData?.value || "This feature is currently disabled.";

    return { enabled, reason };
  } catch (error) {
    console.error(`Error checking endpoint enabled status for ${endpointKey}:`, error);
    return { enabled: true, reason: "" };
  }
}

export function sanitizePayload(body: any): any {
  if (body === null || body === undefined) {
    return body;
  }

  if (typeof body === 'string') {
    let sanitized = body
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<\/?[^>]+(>|$)/g, "")
      .replace(/\x00/g, '');

    if (sanitized.length > 100000) {
      sanitized = sanitized.substring(0, 100000);
    }

    if (sanitized.match(/data:(.*?);base64,[a-zA-Z0-9+/=]+/)) {
      sanitized = sanitized.replace(/data:(.*?);base64,[a-zA-Z0-9+/=]+/g, '[REMOVED BASE64 DATA]');
    }

    return sanitized;
  }

  if (Array.isArray(body)) {
    return body.map(item => sanitizePayload(item));
  }

  if (typeof body === 'object') {
    const sanitizedObj: any = {};
    for (const key in body) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        sanitizedObj[key] = sanitizePayload(body[key]);
      }
    }
    return sanitizedObj;
  }

  return body;
}
