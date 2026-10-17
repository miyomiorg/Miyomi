import { useState, useEffect } from 'react';
import { noticesApi } from '@/services/api';
import type { Tables } from '@/types/db';

export function useNotices() {
  const [notices, setNotices] = useState<Tables<'notices'>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotices() {
      try {
        const data = await noticesApi.list();
        setNotices(data || []);
      } catch (error) {
        console.error('Failed to fetch notices:', error);
        setNotices([]);
      } finally {
        setLoading(false);
      }
    }
    fetchNotices();
  }, []);

  return { notices, loading };
}