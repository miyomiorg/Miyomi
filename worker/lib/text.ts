/**
 * Reading time for HTML/markdown article bodies (~200 words per minute).
 * <style>/<script> contents, tags and entities are not words — blog posts
 * embed CSS blocks that would otherwise inflate the estimate several-fold.
 * Used by both the blog list and detail endpoints so the numbers match.
 */
export function readingMinutes(body: string | null | undefined): number {
  const text = (body || '')
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
