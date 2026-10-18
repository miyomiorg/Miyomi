import { useState } from 'react';
import { Play } from 'lucide-react';
import { getYouTubeEmbedUrl, getYouTubeThumbnail, parseYouTubeId } from '../utils/youtube';

interface YouTubeEmbedProps {
    url: string;
    title?: string;
}

/**
 * Thumbnail-first YouTube embed. Shows the video poster with a play button
 * and only loads the real iframe once tapped — this avoids the blank/stuck
 * iframe you get when pasting a raw watch URL, and keeps the page lighter.
 */
export function YouTubeEmbed({ url, title }: YouTubeEmbedProps) {
    const [playing, setPlaying] = useState(false);
    const id = parseYouTubeId(url);

    // Non-YouTube URL → keep a plain iframe fallback rather than breaking.
    if (!id) {
        return (
            <div className="relative w-full overflow-hidden rounded-xl aspect-video bg-[var(--bg-elev-1)]">
                <iframe
                    src={url}
                    title={title}
                    className="absolute inset-0 h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            </div>
        );
    }

    if (!playing) {
        return (
            <button
                type="button"
                onClick={() => setPlaying(true)}
                className="group relative block w-full overflow-hidden rounded-xl aspect-video bg-[var(--bg-elev-1)]"
                aria-label={`Play video: ${title || 'YouTube video'}`}
            >
                <img
                    src={getYouTubeThumbnail(id)}
                    alt={title || 'Video thumbnail'}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand)] text-white shadow-lg transition-transform duration-200 group-hover:scale-110">
                        <Play className="ml-0.5 h-6 w-6" fill="currentColor" />
                    </span>
                </span>
            </button>
        );
    }

    return (
        <div className="relative w-full overflow-hidden rounded-xl aspect-video bg-black">
            <iframe
                src={getYouTubeEmbedUrl(id, true)}
                title={title}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
        </div>
    );
}