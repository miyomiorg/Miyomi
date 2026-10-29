// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { GuidesPage } from '../src/pages/GuidesPage';
import { CacheManager } from '../src/utils/cache';

// Components use the LazyMotion `m` export (aliased as `motion`); mock both.
vi.mock('motion/react', () => {
  const components = {
    div: ({ children, className }: { children: ReactNode; className?: string }) => createElement('div', { className }, children),
    button: ({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) =>
      createElement('button', { className, onClick }, children),
  };
  return {
    motion: components,
    m: components,
    AnimatePresence: ({ children }: { children: ReactNode }) => children,
  };
});

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  CacheManager.invalidate();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('renders guides without waiting for the notice settings request', async () => {
  const fetcher = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/guides')) {
      return Promise.resolve(new Response(JSON.stringify({
        success: true,
        data: [{
          id: 'guide-1', title: 'Install Guide', slug: 'install-guide', description: 'How to install the app.',
          content: '', content_html: '', content_format: 'markdown', category: 'setup', status: 'published',
          tags: ['install'], related_apps: [], related_extensions: [], metadata: { readTime: '4 min read' },
          created_at: '2026-10-25T00:00:00.000Z', updated_at: '2026-10-25T00:00:00.000Z',
        }],
      })));
    }
    if (url.includes('/api/settings/public')) {
      // Simulate a slow/stalled settings request. It must not hold up the guides list.
      return new Promise<Response>(() => {});
    }
    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });
  vi.stubGlobal('fetch', fetcher);

  await act(async () => {
    root.render(
      createElement(MemoryRouter, { initialEntries: ['/guides'] },
        createElement(GuidesPage, { onNavigate: () => {} }),
      ),
    );
  });

  expect(container.querySelector('h1')?.textContent).toBe('Guides');
  // Short placeholder fits phone widths; the full description lives in aria-label.
  expect(container.querySelector('input')?.getAttribute('placeholder')).toBe('Search guides…');
  expect(container.querySelector('input')?.getAttribute('aria-label')).toBe('Search guides by title, summary, or keywords');
  expect(container.textContent).toContain('All Guides (1)');
  expect(container.textContent).toContain('Install Guide');
  expect(container.textContent).toContain('Setup');
  expect(container.querySelector('.animate-spin')).toBeNull();
});

it('filters guide cards without rendering an on-type suggestion dropdown', async () => {
  const fetcher = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/guides')) {
      return Promise.resolve(new Response(JSON.stringify({
        success: true,
        data: [{
          id: 'guide-1', title: 'Install Guide', slug: 'install-guide', description: 'How to install the app.',
          content: '', content_html: '', content_format: 'markdown', category: 'setup', status: 'published',
          tags: ['install'], related_apps: [], related_extensions: [], metadata: { readTime: '4 min read' },
          created_at: '2026-10-25T00:00:00.000Z', updated_at: '2026-10-25T00:00:00.000Z',
        }],
      })));
    }
    if (url.includes('/api/settings/public')) {
      return Promise.resolve(new Response(JSON.stringify({ success: true, data: {} })));
    }
    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });
  vi.stubGlobal('fetch', fetcher);

  await act(async () => {
    root.render(
      createElement(MemoryRouter, { initialEntries: ['/guides'] },
        createElement(GuidesPage, { onNavigate: () => {} }),
      ),
    );
  });

  const input = container.querySelector('input') as HTMLInputElement;
  await act(async () => {
    input.focus();
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    valueSetter?.call(input, 'install');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  expect(container.textContent).toContain('Install Guide');
  expect(container.textContent).not.toContain('matching guides below');
  expect(container.querySelectorAll('button.group.w-full')).toHaveLength(0);
});

it('dismisses the custom guide notice and remembers it across remounts', async () => {
  const noticeHtml = '<div><span>Guides is under active development.</span><button title="Dismiss"><svg class="lucide lucide-x"></svg></button></div>';
  const fetcher = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/guides')) {
      return Promise.resolve(new Response(JSON.stringify({ success: true, data: [] })));
    }
    if (url.includes('/api/settings/public')) {
      return Promise.resolve(new Response(JSON.stringify({
        success: true,
        data: { guide_notice_enabled: 'true', guide_notice_content: noticeHtml },
      })));
    }
    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });
  vi.stubGlobal('fetch', fetcher);

  const renderPage = () => act(async () => {
    root.render(
      createElement(MemoryRouter, { initialEntries: ['/guides'] },
        createElement(GuidesPage, { onNavigate: () => {} }),
      ),
    );
  });

  await renderPage();
  expect(container.textContent).toContain('Guides is under active development.');

  const dismissButton = container.querySelector('button[title="Dismiss"]');
  expect(container.querySelectorAll('button[title="Dismiss"]')).toHaveLength(1);
  expect(dismissButton).not.toBeNull();
  await act(async () => {
    dismissButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  expect(container.textContent).not.toContain('Guides is under active development.');

  const saved = JSON.parse(localStorage.getItem('miyomi-guide-notice-dismissed-v1') || 'null');
  expect(saved?.expiresAt).toBeGreaterThan(Date.now() + 23 * 60 * 60 * 1000);

  await act(async () => root.unmount());
  root = createRoot(container);
  await renderPage();
  expect(container.textContent).not.toContain('Guides is under active development.');
});

it('adds a fallback close button when the custom notice has none', async () => {
  const fetcher = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/guides')) {
      return Promise.resolve(new Response(JSON.stringify({ success: true, data: [] })));
    }
    if (url.includes('/api/settings/public')) {
      return Promise.resolve(new Response(JSON.stringify({
        success: true,
        data: { guide_notice_enabled: 'true', guide_notice_content: '<div><span>Custom guide notice</span></div>' },
      })));
    }
    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });
  vi.stubGlobal('fetch', fetcher);

  await act(async () => {
    root.render(
      createElement(MemoryRouter, { initialEntries: ['/guides'] },
        createElement(GuidesPage, { onNavigate: () => {} }),
      ),
    );
  });

  expect(container.textContent).toContain('Custom guide notice');
  const dismissButton = container.querySelector('button[title="Dismiss"]');
  expect(dismissButton).not.toBeNull();

  await act(async () => {
    dismissButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  expect(container.textContent).not.toContain('Custom guide notice');
});

it('reuses cached guide categories on a remount', async () => {
  const fetcher = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/guides')) {
      return Promise.resolve(new Response(JSON.stringify({
        success: true,
        data: [{
          id: 'guide-1', title: 'Install Guide', slug: 'install-guide', description: 'How to install the app.',
          content: '', content_html: '', content_format: 'markdown', category: 'setup', status: 'published',
          tags: ['install'], related_apps: [], related_extensions: [], metadata: { readTime: '4 min read' },
          created_at: '2026-10-25T00:00:00.000Z', updated_at: '2026-10-25T00:00:00.000Z',
        }],
      })));
    }
    if (url.includes('/api/settings/public')) {
      return Promise.resolve(new Response(JSON.stringify({ success: true, data: {} })));
    }
    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });
  vi.stubGlobal('fetch', fetcher);

  const renderPage = () => act(async () => {
    root.render(
      createElement(MemoryRouter, { initialEntries: ['/guides'] },
        createElement(GuidesPage, { onNavigate: () => {} }),
      ),
    );
  });

  await renderPage();
  expect(container.textContent).toContain('Install Guide');

  await act(async () => root.unmount());
  root = createRoot(container);
  await renderPage();

  const guideRequests = fetcher.mock.calls.filter(([input]) => String(input).includes('/api/guides'));
  expect(guideRequests).toHaveLength(1);
  expect(container.textContent).toContain('Install Guide');
});
