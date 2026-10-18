/**
 * YouTube helpers — parse a video ID from the many YouTube URL shapes
 * people paste, and build a privacy-friendly embed + thumbnail.
 */

export function parseYouTubeId(url: string): string | null {
    if (!url) return null;
    const trimmed = url.trim();

    // /embed/<id> (also matches youtube-nocookie.com)
    let m = trimmed.match(/(?:youtube\.com|youtube-nocookie\.com)\/embed\/([\w-]{6,})/i);
    if (m) return m[1];

    // youtu.be/<id>
    m = trimmed.match(/youtu\.be\/([\w-]{6,})/i);
    if (m) return m[1];

    // youtube.com/shorts/<id>
    m = trimmed.match(/youtube\.com\/shorts\/([\w-]{6,})/i);
    if (m) return m[1];

    // youtube.com/live/<id>
    m = trimmed.match(/youtube\.com\/live\/([\w-]{6,})/i);
    if (m) return m[1];

    // watch?v=<id> (and watch?…&v=<id>)
    m = trimmed.match(/[?&]v=([\w-]{6,})/i);
    if (m) return m[1];

    return null;
}

export function getYouTubeEmbedUrl(id: string, autoplay = false): string {
    const params = new URLSearchParams({ rel: '0', modestbranding: '1' });
    if (autoplay) params.set('autoplay', '1');
    return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

export function getYouTubeThumbnail(id: string): string {
    return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}