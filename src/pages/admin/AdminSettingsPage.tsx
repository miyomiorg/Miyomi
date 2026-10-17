import { TelegramSettingsForm } from '@/components/admin/TelegramSettingsForm';
import { ChangePasswordForm } from '@/components/admin/ChangePasswordForm';
import { TwoFactorSettings } from '@/components/admin/TwoFactorSettings';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';

export function AdminSettingsPage() {
  const { isSuperAdmin } = useAdmin();
  const { user } = useAuth();
  const totpEnabled = Boolean(user?.totpEnabled);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold font-['Poppins',sans-serif]" style={{ color: 'var(--text-primary)' }}>
        Settings
      </h1>

      {/* Two-Factor Authentication - All admins (super_admin, admin, moderator).
          Shown alone until 2FA is enrolled; the rest of the panel stays gated. */}
      <div className="rounded-xl border p-6" style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}>
        <TwoFactorSettings />
      </div>

      {totpEnabled && (
        <>
          {/* Password Change - All admins */}
          <div className="rounded-xl border p-6" style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}>
            <ChangePasswordForm />
          </div>

          {/* Telegram Settings - Superadmin only */}
          {isSuperAdmin && (
            <div className="rounded-xl border p-6" style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}>
              <TelegramSettingsForm />
            </div>
          )}
        </>
      )}
    </div>
  );
}
