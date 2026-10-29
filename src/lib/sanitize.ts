import createDOMPurify, { type Config } from 'dompurify';

/**
 * Single DOMPurify instance + hooks shared by every page that renders HTML.
 * Keeping the hooks here (instead of as a side effect of one page module)
 * means they apply no matter which page loads first.
 */
const purify = createDOMPurify(window);

/** Allow http(s), mail/tel and the app deep-link schemes used in guides. */
export const ALLOWED_URI_REGEXP =
  /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|mihon|tachiyomi|aniyomi|tachi|cloudstream):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

const IFRAME_HOSTS = [
  'youtube.com', 'youtube-nocookie.com', 'drive.google.com',
  'facebook.com', 'twitter.com', 'x.com', 'instagram.com',
  'tiktok.com', 'vimeo.com', 'reddit.com',
];

/** Exact host or a subdomain of it — `evilyoutube.com` must not pass. */
function isAllowedIframeHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return IFRAME_HOSTS.some((d) => host === d || host.endsWith(`.${d}`));
}

purify.addHook('uponSanitizeElement', (node, data) => {
  if (data.tagName !== 'iframe') return;
  const el = node as Element;
  const src = el.getAttribute('src');
  let allowed = false;
  if (src) {
    try {
      const url = new URL(src, window.location.origin);
      allowed = url.protocol === 'https:' && isAllowedIframeHost(url.hostname);
    } catch {
      allowed = false;
    }
  }
  if (!allowed) node.parentNode?.removeChild(node);
});

purify.addHook('afterSanitizeAttributes', (node) => {
  // New-tab links must not get a handle on window.opener.
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

const RICH_CONFIG: Config = {
  // No <style>: guides can be community-submitted, and a style block can
  // restyle or overlay the whole site.
  ADD_TAGS: ['iframe', 'details', 'summary'],
  ADD_ATTR: [
    'allow', 'allowfullscreen', 'frameborder', 'scrolling', 'style', 'class', 'id', 'target', 'open',
    'data-callout', 'data-callout-type', 'data-container', 'src', 'width', 'height', 'title',
  ],
  FORBID_TAGS: ['style'],
  ALLOWED_URI_REGEXP,
};

/** Guides & FAQ answers: rich formatting + allow-listed embeds, no <style>. */
export function sanitizeRichHtml(html: string): string {
  return purify.sanitize(html || '', RICH_CONFIG) as string;
}

/** Blog posts (admin-authored; existing posts rely on <style> blocks). */
export function sanitizeBlogHtml(html: string): string {
  return purify.sanitize(html || '', { ALLOWED_URI_REGEXP }) as string;
}

/** Admin-managed notices: standard formatting only, no embeds or <style>. */
export function sanitizeNoticeHtml(html: string): string {
  return purify.sanitize(html || '', { ALLOWED_URI_REGEXP, FORBID_TAGS: ['style', 'iframe'] }) as string;
}
