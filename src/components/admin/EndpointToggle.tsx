import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { Power, Settings2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface EndpointToggleProps {
  endpointKey: string;
  title: string;
  description: string;
}

export function EndpointToggle({ endpointKey, title, description }: EndpointToggleProps) {
  const { logAction } = useAdminLogger();
  const [enabled, setEnabled] = useState(true);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [endpointKey]);

  async function fetchSettings() {
    setLoading(true);
    try {
      const { data: enabledData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', `${endpointKey}_enabled`)
        .single();
      
      const { data: reasonData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', `${endpointKey}_disabled_reason`)
        .single();

      if (enabledData) {
        setEnabled(enabledData.value === 'true' || enabledData.value === true);
      }
      if (reasonData) {
        setReason(reasonData.value || '');
      }
    } catch (error) {
      console.error('Error fetching endpoint settings:', error);
    }
    setLoading(false);
  }

  async function handleToggle(newEnabled: boolean) {
    setEnabled(newEnabled);
    await saveSetting(`${endpointKey}_enabled`, newEnabled ? 'true' : 'false', `Turned ${newEnabled ? 'on' : 'off'} ${title}`);
  }

  async function handleReasonSave() {
    if (!reason.trim()) {
      toast.error('Reason cannot be empty');
      return;
    }
    await saveSetting(`${endpointKey}_disabled_reason`, reason, `Updated disabled reason for ${title}`);
  }

  async function saveSetting(key: string, value: string, logMsg: string) {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ key, value, category: 'endpoints', description: `Auto-generated setting for ${key}` }, { onConflict: 'key' });

      if (error) throw error;
      
      await logAction('update' as any, 'settings' as any, key, logMsg);
      toast.success('Settings saved');
    } catch (error: any) {
      toast.error('Failed to save: ' + error.message);
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="h-24 animate-pulse bg-[var(--bg-elev-1)] rounded-xl border border-[var(--divider)]"></div>;
  }

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--divider)] rounded-xl p-5 mb-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className={`p-3 rounded-xl shrink-0 mt-1 transition-colors ${enabled ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
            <Power className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-[var(--text-primary)] flex items-center gap-2">
              {title}
              <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${enabled ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                {enabled ? 'Active' : 'Disabled'}
              </span>
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-xl">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
          <span className="text-sm font-medium text-[var(--text-secondary)]">Off</span>
          <button
            onClick={() => handleToggle(!enabled)}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${enabled ? 'bg-[var(--brand)]' : 'bg-[var(--bg-elev-2)]'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className="text-sm font-medium text-[var(--text-secondary)]">On</span>
        </div>
      </div>

      {!enabled && (
        <div className="mt-5 pt-5 border-t border-[var(--divider)]">
          <div className="flex items-center gap-2 mb-3">
            <Settings2 className="w-4 h-4 text-[var(--text-secondary)]" />
            <h4 className="text-sm font-bold text-[var(--text-primary)]">Disabled Message for Users</h4>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="E.g., Feedback is temporarily disabled for maintenance."
              className="flex-1 bg-[var(--bg-elev-1)] border border-[var(--divider)] rounded-lg px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] transition-colors"
            />
            <button
              onClick={handleReasonSave}
              disabled={saving}
              className="flex items-center justify-center bg-[var(--bg-elev-2)] hover:bg-[var(--chip-bg)] text-[var(--text-primary)] px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-[var(--divider)] disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Msg
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
