import { asc, count, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { hashPassword, requireSuperAdmin } from '../../lib/auth.ts';
import { createDb } from '../../lib/db.ts';
import { fail, isoNow, ok, type AppEnv } from '../../lib/http.ts';
import {
  adminSessions,
  admins,
  moderatorPermissions,
  userRoles,
} from '../../db/schema.ts';

/**
 * Admin & role management — port of the Supabase `manage-admin`
 * Edge Function (called from AdminUsersPage). Super admin only.
 */
export const usersRouter = new Hono<AppEnv>();

type Role = 'super_admin' | 'admin' | 'moderator';

usersRouter.get('/', requireSuperAdmin(), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const [adminRows, roleRows, sessionRows, permissionRows] = await db.batch([
      db.select().from(admins).orderBy(asc(admins.email)),
      db.select().from(userRoles),
      db
        .select({ adminId: adminSessions.adminId, n: count() })
        .from(adminSessions)
        .groupBy(adminSessions.adminId),
      db.select().from(moderatorPermissions),
    ]);
    const sessionCounts = new Map(sessionRows.map((s) => [s.adminId, s.n]));

    const roleByUser = new Map<string, Role[]>();
    for (const r of roleRows) {
      roleByUser.set(r.userId, [...(roleByUser.get(r.userId) ?? []), r.role]);
    }
    const permsByUser = new Map<string, Array<{ resource: string; can_read: boolean; can_write: boolean; can_delete: boolean }>>();
    for (const p of permissionRows) {
      permsByUser.set(p.userId, [
        ...(permsByUser.get(p.userId) ?? []),
        { resource: p.resource, can_read: p.canRead, can_write: p.canWrite, can_delete: p.canDelete },
      ]);
    }
    return ok(
      c,
      adminRows.map(({ passwordHash: _ph, totpSecret, totpLastStep: _ls, sessionVersion: _sv, ...a }) => ({
        ...a,
        totpEnabled: Boolean(totpSecret),
        roles: roleByUser.get(a.id) ?? [],
        permissions: permsByUser.get(a.id) ?? [],
        sessionCount: sessionCounts.get(a.id) ?? 0,
      })),
    );
  } catch (error) {
    console.error('[users] list failed:', error);
    return fail(c, 500, 'Failed to fetch admins');
  }
});

/**
 * POST /admin/users { email, displayName?, password? }
 * Create an admin account with an 'admin' role.
 */
usersRouter.post('/', requireSuperAdmin(), async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!email.includes('@')) return fail(c, 400, 'A valid email is required');
    if (password.length < 8) return fail(c, 400, 'password must be at least 8 characters');

    const db = createDb(c.env.DB);
    const [existing] = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
    if (existing) return fail(c, 409, 'An admin with this email already exists');

    const adminId = crypto.randomUUID();
    const role = ['super_admin', 'admin', 'moderator'].includes(String(body.role)) ? (body.role as Role) : 'admin';
    await db.insert(admins).values({
      id: adminId,
      email,
      passwordHash: await hashPassword(password),
      displayName: typeof body.displayName === 'string' ? body.displayName : null,
      isActive: true,
      createdAt: isoNow(),
      updatedAt: isoNow(),
    });
    await db.insert(userRoles).values({
      id: crypto.randomUUID(),
      userId: adminId,
      role,
    });
    return ok(c, { id: adminId }, 201);
  } catch (error) {
    console.error('[users] create failed:', error);
    return fail(c, 500, 'Failed to create admin');
  }
});

/** DELETE /admin/users/:id — cannot delete yourself */
usersRouter.delete('/:id', requireSuperAdmin(), async (c) => {
  try {
    const id = c.req.param('id');
    if (id === c.get('adminId')) return fail(c, 400, 'You cannot delete your own account');
    const db = createDb(c.env.DB);
    const [admin] = await db.select().from(admins).where(eq(admins.id, id)).limit(1);
    if (!admin) return fail(c, 404, 'Admin not found');
    await db.delete(admins).where(eq(admins.id, id)); // sessions + logs cascade/set-null via FK
    await db.delete(userRoles).where(eq(userRoles.userId, id));
    await db.delete(moderatorPermissions).where(eq(moderatorPermissions.userId, id));
    return ok(c, null);
  } catch (error) {
    console.error('[users] delete failed:', error);
    return fail(c, 500, 'Failed to delete admin');
  }
});

/** PATCH /admin/users/:id { displayName } — update the admin's display name */
usersRouter.patch('/:id', requireSuperAdmin(), async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as { displayName?: string | null } | null;
    if (body?.displayName !== undefined && body.displayName !== null && typeof body.displayName !== 'string') {
      return fail(c, 400, 'displayName must be a string or null');
    }
    const db = createDb(c.env.DB);
    await db
      .update(admins)
      .set({ displayName: body?.displayName ?? null, updatedAt: isoNow() })
      .where(eq(admins.id, c.req.param('id')));
    return ok(c, null);
  } catch (error) {
    console.error('[users] profile update failed:', error);
    return fail(c, 500, 'Failed to update admin profile');
  }
});

/** PATCH /admin/users/:id/active { isActive } */
usersRouter.patch('/:id/active', requireSuperAdmin(), async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as { isActive?: boolean } | null;
    if (typeof body?.isActive !== 'boolean') return fail(c, 400, 'isActive boolean is required');
    if (!body.isActive && c.req.param('id') === c.get('adminId')) {
      return fail(c, 400, 'You cannot deactivate your own account');
    }
    const db = createDb(c.env.DB);
    await db
      .update(admins)
      .set({
        isActive: body.isActive,
        // Deactivation revokes all existing sessions.
        ...(body.isActive ? {} : { sessionVersion: sql`${admins.sessionVersion} + 1` }),
        updatedAt: isoNow(),
      })
      .where(eq(admins.id, c.req.param('id')));
    return ok(c, null);
  } catch (error) {
    console.error('[users] active toggle failed:', error);
    return fail(c, 500, 'Failed to update admin status');
  }
});

/** PUT /admin/users/:id/role { role } — replace the admin's role */
usersRouter.put('/:id/role', requireSuperAdmin(), async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as { role?: Role } | null;
    if (!body?.role || !['super_admin', 'admin', 'moderator'].includes(body.role)) {
      return fail(c, 400, 'role must be super_admin, admin or moderator');
    }
    const id = c.req.param('id');
    if (id === c.get('adminId') && body.role !== 'super_admin') {
      return fail(c, 400, 'You cannot demote your own account');
    }
    const db = createDb(c.env.DB);
    const role = body.role;
    const ops = [
      db.delete(userRoles).where(eq(userRoles.userId, id)),
      db.insert(userRoles).values({ id: crypto.randomUUID(), userId: id, role }),
    ] as const;
    if (role !== 'moderator') {
      await db.batch([...ops, db.delete(moderatorPermissions).where(eq(moderatorPermissions.userId, id))]);
    } else {
      await db.batch(ops);
    }
    return ok(c, null);
  } catch (error) {
    console.error('[users] role update failed:', error);
    return fail(c, 500, 'Failed to update role');
  }
});

/**
 * PUT /admin/users/:id/permissions
 * { permissions: [{ resource, can_read, can_write, can_delete }] }
 * Full replace of moderator permissions.
 */
usersRouter.put('/:id/permissions', requireSuperAdmin(), async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as {
      permissions?: Array<{ resource?: string; can_read?: boolean; can_write?: boolean; can_delete?: boolean }>;
    } | null;
    if (!Array.isArray(body?.permissions)) return fail(c, 400, 'permissions array is required');
    const id = c.req.param('id');
    const db = createDb(c.env.DB);
    const rows = body!.permissions
      .filter((p) => typeof p.resource === 'string' && p.resource)
      .map((p) => ({
        id: crypto.randomUUID(),
        userId: id,
        resource: p.resource!,
        canRead: p.can_read === true,
        canWrite: p.can_write === true,
        canDelete: p.can_delete === true,
      }));
    const clear = db.delete(moderatorPermissions).where(eq(moderatorPermissions.userId, id));
    if (rows.length > 0) {
      await db.batch([clear, db.insert(moderatorPermissions).values(rows)]);
    } else {
      await clear;
    }
    return ok(c, null);
  } catch (error) {
    console.error('[users] permissions update failed:', error);
    return fail(c, 500, 'Failed to update permissions');
  }
});

/** POST /admin/users/:id/reset-password { password } */
usersRouter.post('/:id/reset-password', requireSuperAdmin(), async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as { password?: string } | null;
    if (typeof body?.password !== 'string' || body.password.length < 8) {
      return fail(c, 400, 'password must be at least 8 characters');
    }
    const db = createDb(c.env.DB);
    const id = c.req.param('id');
    const [admin] = await db.select().from(admins).where(eq(admins.id, id)).limit(1);
    if (!admin) return fail(c, 404, 'Admin not found');
    await db
      .update(admins)
      .set({
        passwordHash: await hashPassword(body.password),
        totpSecret: null,
        totpLastStep: null,
        sessionVersion: sql`${admins.sessionVersion} + 1`,
        updatedAt: isoNow(),
      })
      .where(eq(admins.id, id));
    return ok(c, null);
  } catch (error) {
    console.error('[users] reset-password failed:', error);
    return fail(c, 500, 'Failed to reset password');
  }
});
