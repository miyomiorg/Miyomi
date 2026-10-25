import { and, desc, eq, like, or, sql } from 'drizzle-orm';
import type { AnySQLiteTable } from 'drizzle-orm/sqlite-core';
import { Hono } from 'hono';
import { createDb } from '../../lib/db.ts';
import {
  fail,
  isoNow,
  ok,
  pagination,
  requireAdmin,
  requireResource,
  type AppEnv,
} from '../../lib/http.ts';
import { apps, blogPosts, extensions, guides } from '../../db/schema.ts';
import {
  deleteContentItem,
  findContentItem,
  generateSlug,
  prepareAppPayload,
  prepareExtensionPayload,
  setAppGroups,
  setExtensionGroups,
  syncAppCompatibility,
  syncExtensionCompatibility,
} from './content.ts';

type ContentKind = 'apps' | 'extensions' | 'guides' | 'blog';

interface KindConfig {
  /** All four content tables share the id/slug/status/updatedAt columns */
  table: AnySQLiteTable;
  nameColumn: 'name' | 'title';
  /** Moderator permission resource (matches the frontend pathToResource map) */
  resource: string;
}

const KINDS: Record<ContentKind, KindConfig> = {
  apps: { table: apps, nameColumn: 'name', resource: 'apps' },
  extensions: { table: extensions, nameColumn: 'name', resource: 'extensions' },
  guides: { table: guides, nameColumn: 'title', resource: 'guides' },
  blog: { table: blogPosts, nameColumn: 'title', resource: 'blog_posts' },
};

/**
 * Admin CRUD for content tables — one router instance per kind,
 * mounted at /admin/apps, /admin/extensions, /admin/guides, /admin/blog.
 * Saves sync compatibility groups + compatible_with (ports of
 * compatSync setAppGroups / syncAppCompatibility & friends).
 */
export function makeContentRouter(kind: ContentKind) {
  const router = new Hono<AppEnv>();
  const cfg = KINDS[kind];

  if (kind === 'apps' || kind === 'extensions') {
    const noteTable = kind === 'apps' ? apps : extensions;
    router.put('/:id/note', requireAdmin(), requireResource(cfg.resource, 'write'), async (c) => {
      try {
        const body = await c.req.json();
        if (!body || typeof body.note !== 'string' || body.note.length > 2000 ||
          !['info', 'warning', 'danger'].includes(body.severity) ||
          (body.sticky !== undefined && typeof body.sticky !== 'boolean')) return fail(c, 400, 'Invalid repository note');
        const [row] = await createDb(c.env.DB).update(noteTable).set({
          moderatorNote: body.note.trim() || null,
          noteSeverity: body.note.trim() ? body.severity : null,
          ...(body.sticky === undefined ? {} : { noticeSticky: body.sticky }),
          updatedAt: isoNow(),
        }).where(eq(noteTable.id, c.req.param('id'))).returning({ id: noteTable.id });
        if (!row) return fail(c, 404, 'Repository not found');
        return ok(c, row);
      } catch { return fail(c, 500, 'Failed to save repository note'); }
    });
  }

  /**
   * Build a search predicate over the kind's name/slug columns.
   * workerd/D1 rejects bound LIKE patterns longer than 50 chars
   * (SQLITE_MAX_LIKE_PATTERN_LENGTH), so clamp the term to keep
   * `%<term>%` within that budget instead of failing the request.
   */
  function searchCond(search: string) {
    const term = search.slice(0, 48);
    const t = cfg.table as typeof apps;
    const nameCol =
      cfg.nameColumn === 'title' ? (t as unknown as typeof blogPosts).title : t.name;
    return or(like(nameCol, `%${term}%`), like(t.slug, `%${term}%`));
  }

  /** GET / — list (all statuses) with ?status=&search=&limit=&offset= */
  router.get('/', requireAdmin(), requireResource(cfg.resource, 'read'), async (c) => {
    try {
      const db = createDb(c.env.DB);
      const { limit, offset } = pagination(c);
      const conds = [];
      if (c.req.query('status')) conds.push(eq((cfg.table as typeof apps).status, c.req.query('status')!));
      const search = c.req.query('search');
      if (search) conds.push(searchCond(search));

      const t = cfg.table as typeof apps;
      const rows = await db
        .select()
        .from(t)
        .where(conds.length ? and(...(conds as never[])) : undefined)
        .orderBy(desc(t.updatedAt))
        .limit(limit)
        .offset(offset);

      const totalRows = await db
        .select({ total: sql<number>`count(*)` })
        .from(t)
        .where(conds.length ? and(...(conds as never[])) : undefined)
        .limit(1);

      return ok(c, { items: rows, total: totalRows[0]?.total ?? rows.length });
    } catch (error) {
      console.error(`[admin/${kind}] list failed:`, error);
      return fail(c, 500, 'Failed to fetch items');
    }
  });

  /** GET /:idOrSlug — one item (any status) */
  router.get('/:idOrSlug', requireAdmin(), requireResource(cfg.resource, 'read'), async (c) => {
    try {
      const db = createDb(c.env.DB);
      const row = await findContentItem(db, kind === 'blog' ? 'blog' : kind === 'apps' ? 'app' : kind === 'extensions' ? 'extension' : 'guide', c.req.param('idOrSlug'));
      if (!row) return fail(c, 404, 'Item not found');
      return ok(c, row);
    } catch (error) {
      console.error(`[admin/${kind}] get failed:`, error);
      return fail(c, 500, 'Failed to fetch item');
    }
  });

  /** POST / — create */
  router.post('/', requireAdmin(), requireResource(cfg.resource, 'write'), async (c) => {
    try {
      const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body) return fail(c, 400, 'JSON body required');
      const name = typeof (body[cfg.nameColumn as string]) === 'string' ? (body[cfg.nameColumn as string] as string) : '';
      if (!name) return fail(c, 400, `${cfg.nameColumn} is required`);

      const db = createDb(c.env.DB);
      let id: string;

      if (kind === 'apps' || kind === 'extensions') {
        const { payload, groupIds, manualCompat } =
          kind === 'apps' ? prepareAppPayload(body, false) : prepareExtensionPayload(body, false);
        id = crypto.randomUUID();
        (payload as Record<string, unknown>).id = id;
        (payload as Record<string, unknown>).createdAt = isoNow();
        (payload as Record<string, unknown>).updatedAt = isoNow();
        if (typeof body.status === 'string') payload.status = body.status;
        const table = kind === 'apps' ? apps : extensions;
        try {
          await db.insert(table).values(payload as never);
        } catch (err) {
          if (String((err as Error)?.message ?? err).includes('UNIQUE')) {
            return fail(c, 409, `Slug conflict: '${payload.slug}' already exists`);
          }
          throw err;
        }
        if (kind === 'apps') {
          await setAppGroups(db, id, groupIds);
          await syncAppCompatibility(db, id, name, groupIds, manualCompat);
        } else {
          await setExtensionGroups(db, id, groupIds);
          await syncExtensionCompatibility(db, id, name, groupIds, manualCompat);
        }
      } else {
        const t = kind === 'guides' ? guides : blogPosts;
        const slug =
          (typeof body.slug === 'string' && body.slug) || generateSlug(name) || null;
        id = crypto.randomUUID();
        const values: Record<string, unknown> = {
          id,
          title: name,
          slug,
          category: typeof body.category === 'string' ? body.category : kind === 'guides' ? 'General' : 'General',
          description: typeof body.description === 'string' ? body.description : null,
          content: typeof body.content === 'string' ? body.content : '',
          author: typeof body.author === 'string' ? body.author : null,
          status: typeof body.status === 'string' ? body.status : 'published',
          createdAt: isoNow(),
          updatedAt: isoNow(),
        };
        for (const key of [
          'contentFormat',
          'contentHtml',
          'contentMode',
          'templateVersion',
          'publishedAt',
          'ogImageUrl',
          'seoTitle',
          'seoDescription',
          'thumbnailUrl',
          'thumbnailAlt',
          'authorName',
          'authorRole',
          'authorAvatarUrl',
          'relatedApps',
          'relatedExtensions',
          'tags',
          'metadata',
          'excerpt',
        ] as const) {
          if (body[key] !== undefined) values[key] = body[key];
        }
        if (kind === 'blog') {
          if (body.isPinned !== undefined) values.isPinned = body.isPinned;
          if (body.authorId !== undefined) values.authorId = body.authorId;
        }
        try {
          await db.insert(t).values(values as never);
        } catch (err) {
          if (String((err as Error)?.message ?? err).includes('UNIQUE')) {
            return fail(c, 409, `Slug conflict: '${slug}' already exists`);
          }
          throw err;
        }
      }

      return ok(c, { id }, 201);
    } catch (error) {
      console.error(`[admin/${kind}] create failed:`, error);
      return fail(c, 500, 'Failed to create item');
    }
  });

  /** PUT /:id — full update (re-saves groups/compat when provided) */
  router.put('/:idOrSlug', requireAdmin(), requireResource(cfg.resource, 'write'), async (c) => {
    try {
      const db = createDb(c.env.DB);
      const ref = c.req.param('idOrSlug');
      const kindKey = kind === 'blog' ? 'blog' : kind === 'apps' ? 'app' : kind === 'extensions' ? 'extension' : 'guide';
      const existing = await findContentItem(db, kindKey, ref);
      if (!existing) return fail(c, 404, 'Item not found');
      const id = (existing as { id: string }).id;

      const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body) return fail(c, 400, 'JSON body required');

      if (kind === 'apps' || kind === 'extensions') {
        const { payload, groupIds, manualCompat } =
          kind === 'apps'
            ? prepareAppPayload({ ...(existing as Record<string, unknown>), ...body }, true)
            : prepareExtensionPayload({ ...(existing as Record<string, unknown>), ...body }, true);

        const table = kind === 'apps' ? apps : extensions;
        try {
          await db.update(table).set({ ...(payload as object), updatedAt: isoNow() }).where(eq(table.id, id));
        } catch (error) {
          if (String((error as Error)?.message ?? error).includes('UNIQUE')) return fail(c, 409, 'Slug already exists');
          throw error;
        }

        const name = typeof body[cfg.nameColumn as string] === 'string' ? (body[cfg.nameColumn as string] as string) : (existing as { name: string }).name;
        if (Array.isArray(body.selectedGroupIds) || Array.isArray(body.compatibleWith)) {
          if (kind === 'apps') {
            await setAppGroups(db, id, groupIds);
            await syncAppCompatibility(db, id, name, groupIds, manualCompat);
          } else {
            await setExtensionGroups(db, id, groupIds);
            await syncExtensionCompatibility(db, id, name, groupIds, manualCompat);
          }
        }
      } else {
        const t = kind === 'guides' ? guides : blogPosts;
        const values: Record<string, unknown> = { updatedAt: isoNow() };
        for (const key of [
          'title',
          'slug',
          'category',
          'description',
          'content',
          'contentFormat',
          'contentHtml',
          'contentMode',
          'templateVersion',
          'author',
          'authorName',
          'status',
          'publishedAt',
          'ogImageUrl',
          'seoTitle',
          'seoDescription',
          'thumbnailUrl',
          'thumbnailAlt',
          'authorRole',
          'authorAvatarUrl',
          'relatedApps',
          'relatedExtensions',
          'tags',
          'metadata',
          'excerpt',
        ] as const) {
          if (body[key] !== undefined) values[key] = body[key];
        }
        if (kind === 'blog') {
          if (body.isPinned !== undefined) values.isPinned = body.isPinned;
          if (body.authorId !== undefined) values.authorId = body.authorId;
        }
        try {
          await db.update(t).set(values as never).where(eq((t as unknown as typeof apps).id, id));
        } catch (error) {
          if (String((error as Error)?.message ?? error).includes('UNIQUE')) return fail(c, 409, 'Slug already exists');
          throw error;
        }
      }

      return ok(c, null);
    } catch (error) {
      console.error(`[admin/${kind}] update failed:`, error);
      return fail(c, 500, 'Failed to update item');
    }
  });

  /** PATCH /:id/status { status } */
  router.patch('/:idOrSlug/status', requireAdmin(), requireResource(cfg.resource, 'write'), async (c) => {
    try {
      const db = createDb(c.env.DB);
      const ref = c.req.param('idOrSlug');
      const kindKey = kind === 'blog' ? 'blog' : kind === 'apps' ? 'app' : kind === 'extensions' ? 'extension' : 'guide';
      const existing = await findContentItem(db, kindKey, ref);
      if (!existing) return fail(c, 404, 'Item not found');
      const id = (existing as { id: string }).id;
      const body = (await c.req.json().catch(() => null)) as { status?: string } | null;
      if (!body?.status || typeof body.status !== 'string') return fail(c, 400, 'status is required');

      const t = cfg.table as unknown as typeof apps;
      await db.update(t).set({ status: body.status, updatedAt: isoNow() }).where(eq(t.id, id));
      return ok(c, null);
    } catch (error) {
      console.error(`[admin/${kind}] status failed:`, error);
      return fail(c, 500, 'Failed to update status');
    }
  });

  /** DELETE /:id */
  router.delete('/:idOrSlug', requireAdmin(), requireResource(cfg.resource, 'delete'), async (c) => {
    try {
      const db = createDb(c.env.DB);
      const ref = c.req.param('idOrSlug');
      const kindKey = kind === 'blog' ? 'blog' : kind === 'apps' ? 'app' : kind === 'extensions' ? 'extension' : 'guide';
      const existing = await findContentItem(db, kindKey, ref);
      if (!existing) return fail(c, 404, 'Item not found');
      const id = (existing as { id: string }).id;
      await deleteContentItem(db, kindKey, id);
      return ok(c, null);
    } catch (error) {
      console.error(`[admin/${kind}] delete failed:`, error);
      return fail(c, 500, 'Failed to delete item');
    }
  });

  return router;
}
