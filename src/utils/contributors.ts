import { supabase } from '@/integrations/supabase/client';

interface Contribution {
  type: 'app' | 'extension';
  id: string;
  name: string;
}

/**
 * Finds or creates a contributor profile and appends a new contribution.
 * Matches by email first (if provided), then by name as fallback.
 * Returns the contributor ID.
 */
export async function upsertContributor(
  submitterName: string | null,
  submitterEmail: string | null,
  submitterContact: string | null,
  contribution: Contribution
): Promise<string | null> {
  if (!submitterName) return null;

  try {
    // 1. Try to find existing contributor by email (preferred) or name
    let existingContributor: any = null;

    if (submitterEmail) {
      const { data } = await (supabase as any)
        .from('contributors')
        .select('*')
        .ilike('email', submitterEmail)
        .maybeSingle();
      existingContributor = data;
    }

    if (!existingContributor) {
      const { data } = await (supabase as any)
        .from('contributors')
        .select('*')
        .ilike('name', submitterName)
        .maybeSingle();
      existingContributor = data;
    }

    if (existingContributor) {
      // 2. Append new contribution to existing contributor
      const currentContributions: Contribution[] = existingContributor.contributions || [];

      // Avoid duplicates (same type + id)
      const alreadyExists = currentContributions.some(
        (c) => c.type === contribution.type && c.id === contribution.id
      );

      if (!alreadyExists) {
        const updatedContributions = [...currentContributions, contribution];
        await (supabase as any)
          .from('contributors')
          .update({ contributions: updatedContributions })
          .eq('id', existingContributor.id);
      }

      return existingContributor.id;
    } else {
      // 3. Create new contributor
      const { data: newContributor, error } = await (supabase as any)
        .from('contributors')
        .insert({
          name: submitterName,
          email: submitterEmail || null,
          contact: submitterContact || null,
          contributions: [contribution],
        })
        .select()
        .single();

      if (error) throw error;
      return newContributor?.id || null;
    }
  } catch (err) {
    console.error('Failed to upsert contributor:', err);
    return null;
  }
}
