// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { RepositoryStatus } from '../src/components/RepositoryStatus';
import { TagBadge } from '../src/components/TagBadge';
import { DetailActions } from '../src/components/DetailActions';

const permission = vi.hoisted(() => ({ write: false }));
vi.mock('../src/hooks/useAdmin', () => ({ useAdmin: () => ({ hasPermission: () => permission.write }) }));
let root: Root;
let container: HTMLDivElement;
afterEach(async () => { if (root) await act(async () => root.unmount()); container?.remove(); permission.write = false; });
async function render(element: ReturnType<typeof createElement>) {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div'); document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(element));
}
it('renders full pending/on-hold status labels without mobile hiding', async () => {
  await render(createElement('div', null, createElement(RepositoryStatus, { status: 'on_hold' }),
    createElement(RepositoryStatus, { status: 'pending' }), createElement(TagBadge, { tag: 'On Hold' })));
  expect(container.textContent).toBe('On HoldPendingOn Hold');
  expect(container.querySelector('[class*="hidden"]')).toBeNull();
});
it('exposes direct share/report/add actions and only grants Edit with write permission', async () => {
  const share = vi.fn(), report = vi.fn(), add = vi.fn();
  const element = () => createElement(MemoryRouter, null, createElement(DetailActions, {
    targetType: 'extensions', targetId: 'repo', targetName: 'Repo', onShareClick: share, onReportClick: report, onAddClick: add,
  }));
  await render(element());
  expect([...container.querySelectorAll('button')].map(b => b.textContent?.trim())).toEqual(['Share', 'Report', 'Add']);
  await act(async () => { for (const button of container.querySelectorAll('button')) button.click(); });
  expect(share).toHaveBeenCalledTimes(1); expect(report).toHaveBeenCalledTimes(1); expect(add).toHaveBeenCalledTimes(1);
  permission.write = true;
  await act(async () => root.render(element()));
  expect([...container.querySelectorAll('button')].map(b => b.textContent?.trim())).toEqual(['Share', 'Edit', 'Report', 'Add']);
});
