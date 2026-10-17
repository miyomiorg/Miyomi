import { adminLogsApi } from '@/services/api';

export function useAdminLogger() {
  const logAction = async (
    action: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'restore',
    resourceType: 'app' | 'extension' | 'guide' | 'faq' | 'submission',
    resourceId: string | null,
    resourceName: string,
    details?: Record<string, any>,
  ) => {
    try {
      await adminLogsApi.create({
        action,
        resourceType,
        resourceId: resourceId ?? undefined,
        resourceName,
        details,
      });
    } catch (error) {
      console.error('Admin logging error:', error);
      // Don't throw - logging should not interrupt user actions
    }
  };

  return { logAction };
}
