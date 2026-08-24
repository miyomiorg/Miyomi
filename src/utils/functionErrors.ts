/**
 * Extracts a human-friendly error message from a Supabase Edge Function response.
 * Handles both returned body data, `error.context.json()`, and fallback error messages.
 */
export async function extractFunctionError(
  error: any,
  data?: any,
  fallback = 'Request failed'
): Promise<string> {
  if (data?.error && typeof data.error === 'string') {
    return data.error;
  }
  if (data?.message && typeof data.message === 'string') {
    return data.message;
  }

  if (error?.context && typeof error.context.json === 'function') {
    try {
      const body = await error.context.json();
      if (body?.error && typeof body.error === 'string') return body.error;
      if (body?.message && typeof body.message === 'string') return body.message;
    } catch {
      // context JSON parsing failed, try text
      try {
        if (typeof error.context.text === 'function') {
          const text = await error.context.text();
          if (text && text.trim()) return text.trim();
        }
      } catch { }
    }
  }

  if (error?.message && typeof error.message === 'string') {
    // If the message is generic from Supabase client, provide clean fallback
    if (error.message.includes('non-2xx status code')) {
      return fallback;
    }
    return error.message;
  }

  return fallback;
}
