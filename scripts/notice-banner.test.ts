// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { NoticeBanner } from '../src/components/NoticeBanner';
import { noticeTypeOptions, noticeTypeStyles } from '../src/components/noticeTypes';
import { useNotices } from '../src/hooks/useNotices';
import { CacheManager } from '../src/utils/cache';
import type { Tables } from '../src/types/db';

// Keep assertions about notice state independent of exit-animation timing.
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className, role, ...props }: { children: ReactNode; className?: string; role?: string; [key: string]: unknown }) =>
      createElement('div', { className, role, 'data-notice-type': props['data-notice-type'] }, children),
  },
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
}));

let root: Root;
let container: HTMLDivElement;
let notices: Tables<'notices'>[];
let fetcher: ReturnType<typeof vi.fn>;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  notices = [{
    id: 'notice-a', title: 'Maintenance', message: 'Original message', type: 'info',
    active: true, dismissible: true, priority: 0, created_by: null,
    start_date: null, end_date: null, created_at: '2026-10-25', updated_at: '2026-10-25',
  }];
  fetcher = vi.fn(async () => new Response(JSON.stringify({ success: true, data: notices })));
  vi.stubGlobal('fetch', fetcher);
  container = document.createElement('div'); document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount()); container.remove();
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});
const render = () => act(async () => root.render(createElement(NoticeBanner)));
const dismiss = () => act(async () => container.querySelector('button')!.click());
const refresh = () => act(async () => CacheManager.invalidate());

it('defines a distinct icon, label, and tone for every notice type', () => {
  expect(new Set(noticeTypeOptions.map(type => noticeTypeStyles[type].icon)).size).toBe(4);
  expect(new Set(noticeTypeOptions.map(type => noticeTypeStyles[type].label)).size).toBe(4);
  expect(new Set(noticeTypeOptions.map(type => noticeTypeStyles[type].tone)).size).toBe(4);
});

it.each([
  ['info', 'border-blue-300'],
  ['warning', 'border-amber-300'],
  ['error', 'border-red-300'],
  ['success', 'border-emerald-300'],
] as const)('renders %s notices with their own color and icon', async (type, tone) => {
  notices[0] = { ...notices[0], type };
  await render();
  const banner = container.querySelector<HTMLElement>('[role="alert"]')!;
  expect(banner.dataset.noticeType).toBe(type);
  expect(banner.className).toContain(tone);
  expect(banner.querySelector('svg')).not.toBeNull();
});

it('remembers an unchanged dismissal across mounts and ignores timestamp/priority-only edits', async () => {
  await render(); await dismiss();
  expect(container.textContent).toBe('');
  await act(async () => root.render(null));
  await render();
  expect(container.textContent).toBe('');
  notices[0] = { ...notices[0], updated_at: '2026-10-26', priority: 10 };
  await refresh();
  expect(container.textContent).toBe('');
});

it.each(['title', 'message', 'type'] as const)('shows an edited %s again and remembers its new dismissal', async field => {
  await render(); await dismiss();
  notices[0] = { ...notices[0], [field]: field === 'type' ? 'warning' : 'Edited content' };
  await refresh();
  expect(container.querySelector('button')).not.toBeNull();
  expect(container.textContent).toContain(notices[0].message);
  await dismiss();
  await act(async () => root.render(null));
  await render();
  expect(container.textContent).toBe('');
});

it('keeps dismissals separate for different notices and always shows non-dismissible notices', async () => {
  await render(); await dismiss();
  notices.push({ ...notices[0], id: 'notice-b', title: 'Another notice' });
  await refresh();
  expect(container.textContent).toContain('Another notice');
  expect(container.textContent).not.toContain('Maintenance');
  notices = [{ ...notices[0], dismissible: false }];
  await refresh();
  expect(container.textContent).toContain('Maintenance');
  expect(container.querySelector('button')).toBeNull();
});

it('does not permanently hide edited notices using legacy ID-only dismissals', async () => {
  localStorage.setItem('miyomi-dismissed-notices', JSON.stringify(['notice-a']));
  await render();
  expect(container.textContent).toContain('Maintenance');
  await dismiss();
  const saved = JSON.parse(localStorage.getItem('miyomi-dismissed-notices-v2')!);
  expect(saved['notice-a']).toBe(JSON.stringify(['Maintenance', 'Original message', 'info']));
});

it('still dismisses within the session when persistent storage is blocked', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  await render(); await dismiss();
  expect(container.textContent).toBe('');
});

it('shares notice requests and refreshes stale notices when the visitor returns', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(100_000);
  function Probe() { const { notices } = useNotices(); return createElement('span', null, notices[0]?.message); }
  await act(async () => root.render(createElement('div', null, createElement(Probe), createElement(Probe))));
  expect(fetcher).toHaveBeenCalledTimes(1);
  await act(async () => window.dispatchEvent(new Event('focus')));
  expect(fetcher).toHaveBeenCalledTimes(1);
  notices[0] = { ...notices[0], message: 'Updated while away' };
  clock.mockReturnValue(161_000);
  await act(async () => window.dispatchEvent(new Event('focus')));
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(container.textContent).toBe('Updated while awayUpdated while away');
});
