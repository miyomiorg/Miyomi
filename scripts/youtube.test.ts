import { describe, expect, it } from 'vitest';
import { getYouTubeEmbedUrl, getYouTubeThumbnail, parseYouTubeId } from '../src/utils/youtube';

describe('parseYouTubeId', () => {
  it('handles every common URL shape', () => {
    const id = 'dQw4w9WgXcQ';
    expect(parseYouTubeId(`https://www.youtube.com/watch?v=${id}`)).toBe(id);
    expect(parseYouTubeId(`https://m.youtube.com/watch?v=${id}&list=PLxyz`)).toBe(id);
    expect(parseYouTubeId(`https://youtu.be/${id}`)).toBe(id);
    expect(parseYouTubeId(`https://www.youtube.com/shorts/${id}`)).toBe(id);
    expect(parseYouTubeId(`https://www.youtube.com/live/${id}`)).toBe(id);
    expect(parseYouTubeId(`https://www.youtube.com/embed/${id}`)).toBe(id);
    expect(parseYouTubeId(`https://www.youtube-nocookie.com/embed/${id}`)).toBe(id);
    expect(parseYouTubeId('not a url')).toBeNull();
    expect(parseYouTubeId('')).toBeNull();
  });
});

describe('getYouTubeEmbedUrl', () => {
  it('uses the privacy-friendly nocookie domain and toggles autoplay', () => {
    const base = getYouTubeEmbedUrl('dQw4w9WgXcQ');
    expect(base).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(base).toContain('rel=0');
    expect(base).not.toContain('autoplay');
    expect(getYouTubeEmbedUrl('dQw4w9WgXcQ', true)).toContain('autoplay=1');
  });
});

describe('getYouTubeThumbnail', () => {
  it('builds the img.youtube.com poster URL', () => {
    expect(getYouTubeThumbnail('dQw4w9WgXcQ')).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });
});