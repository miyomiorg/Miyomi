import { inArray } from 'drizzle-orm';
import { guides } from '../db/schema.ts';

/** Guide statuses that are publicly visible (positive allow-list, not "!= draft"). */
export const PUBLIC_GUIDE_STATUSES = ['published', 'approved'] as const;

export const guideIsPublic = () => inArray(guides.status, [...PUBLIC_GUIDE_STATUSES]);

export const isPublicGuideStatus = (status: string | null | undefined) =>
  (PUBLIC_GUIDE_STATUSES as readonly string[]).includes(status ?? '');
