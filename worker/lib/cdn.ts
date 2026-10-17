/**
 * Client for the self-hosted Miyomi media CDN.
 *
 * Miyomi normally scrapes content from its own source, so it hosts no media
 * itself and this module is OPTIONAL. It is kept wired up so an admin upload
 * feature can be added later without re-deriving the API.
 *
 * CDN: https://cdn-bevore.misfits.workers.dev — a Google Drive → Cloudflare
 * Worker proxy (built by tas33n). See DEVELOPERS.md → "Media / CDN".
 *
 * Required env (only when actually used):
 *   CDN_BASE_URL  e.g. https://cdn-bevore.misfits.workers.dev
 *   CDN_API_KEY   bearer token
 *
 * API (as documented by the CDN):
 *   POST {CDN_BASE_URL}/api/files
 *     Authorization: Bearer <CDN_API_KEY>
 *     multipart/form-data:
 *       file=@image.jpg
 *       metadata={"name":"image.jpg"}
 *   → { status: "success", data: { kind, id, name, mimeType, rawUrl } }
 *
 * The returned `rawUrl` is `{CDN_BASE_URL}/files/{id}` and can be stored in
 * `apps.icon_url` / `og_image_url` and rendered directly.
 *
 * NOTE: delete/list endpoints are not documented here; confirm them from the
 * CDN's own API docs before relying on them (do not guess).
 */
import type { Bindings } from '../env';

export interface CdnFile {
  id: string;
  name: string;
  mimeType: string;
  /** Public URL: {CDN_BASE_URL}/files/{id} */
  rawUrl: string;
}

/** True when both CDN secrets are present. */
export function cdnConfigured(env: Bindings): boolean {
  return Boolean(env.CDN_BASE_URL && env.CDN_API_KEY);
}

/** Public URL for a previously uploaded file id. */
export function cdnFileUrl(env: Bindings, id: string): string {
  const base = (env.CDN_BASE_URL ?? '').replace(/\/$/, '');
  return `${base}/files/${id}`;
}

/**
 * Upload a blob/file to the CDN. `options.name` is the filename sent to the
 * CDN (defaults to the Blob's `name` or "upload"). Throws if the CDN is not
 * configured or the request fails.
 */
export async function cdnUpload(
  env: Bindings,
  file: Blob,
  options: { name?: string; metadata?: Record<string, unknown> } = {},
): Promise<CdnFile> {
  const base = env.CDN_BASE_URL?.replace(/\/$/, '');
  if (!base || !env.CDN_API_KEY) {
    throw new Error('CDN is not configured (set CDN_BASE_URL and CDN_API_KEY)');
  }

  const blobName = typeof (file as File).name === 'string' ? (file as File).name : '';
  const name = options.name || blobName || 'upload';

  const form = new FormData();
  form.append('file', file, name);
  form.append('metadata', JSON.stringify({ name, ...(options.metadata ?? {}) }));

  const res = await fetch(`${base}/api/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.CDN_API_KEY}` },
    body: form,
  });

  const body = (await res.json().catch(() => null)) as
    | { status?: string; data?: CdnFile; error?: string; message?: string }
    | null;

  if (!res.ok || body?.status !== 'success' || !body.data) {
    const detail = body?.error || body?.message || `HTTP ${res.status}`;
    throw new Error(`CDN upload failed: ${detail}`);
  }
  return body.data;
}
