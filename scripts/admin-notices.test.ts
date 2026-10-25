// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AdminNoticesPage } from '../src/pages/admin/AdminNoticesPage';
import type { Tables } from '../src/types/db';

let root: Root;
let container: HTMLDivElement;

const notice = (overrides: Partial<Tables<'notices'>>): Tables<'notices'> => ({
  id: 'notice', title: 'Notice', message: 'Message', type: 'info', active: true,
  dismissible: true, priority: 0, created_by: null, start_date: null, end_date: null,
  created_at: '2026-10-25T12:00:00.000Z', updated_at: '2026-10-25T12:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
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

it('lists the newest notice first with its type theme and publish date', async () => {
  const notices = [
    notice({ id: 'older', title: 'Older notice', priority: 100, created_at: '2026-01-05T09:00:00.000Z', start_date: '2026-01-05T10:00' }),
    notice({ id: 'newer', title: 'Newer notice', type: 'success', created_at: '2026-10-25T12:00:00.000Z' }),
  ];
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true, data: notices }))));

  await act(async () => root.render(createElement(AdminNoticesPage)));

  const cards = [...container.querySelectorAll<HTMLElement>('[data-notice-type]')];
  expect(cards.map(card => card.dataset.noticeType)).toEqual(['success', 'info']);
  expect(cards[0].querySelector('.border-emerald-300')).not.toBeNull();
  expect(cards[1].querySelector('.border-blue-300')).not.toBeNull();
  expect(container.textContent).toContain('Success');
  expect(container.textContent).toContain('Info');
  expect(container.textContent).toContain(`Published ${new Date('2026-10-25T12:00:00.000Z').toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })}`);
}, 15_000);
