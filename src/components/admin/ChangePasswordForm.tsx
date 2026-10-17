import { useState } from 'react';
import { authApi } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { AdminButton, AdminFormField, AdminInput } from './AdminFormElements';

export function ChangePasswordForm() {
    const { signOut } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error('Please fill in all fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            toast.error('New password must be at least 8 characters');
            return;
        }

        if (currentPassword === newPassword) {
            toast.error('New password must be different from current password');
            return;
        }

        setLoading(true);

        try {
            await authApi.changePassword({ currentPassword, newPassword });

            toast.success('Password updated successfully! Logging out...');

            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');

            await signOut();
        } catch (error: any) {
            console.error('Password change error:', error);
            toast.error(error.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    const getPasswordStrength = (password: string): { strength: string; color: string; percentage: number } => {
        if (!password) return { strength: '', color: 'var(--divider)', percentage: 0 };

        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        if (score < 2) return { strength: 'Weak', color: '#f97316', percentage: 25 };
        if (score < 3) return { strength: 'Fair', color: '#fb7185', percentage: 50 };
        if (score < 4) return { strength: 'Good', color: '#facc15', percentage: 75 };
        return { strength: 'Strong', color: '#10b981', percentage: 100 };
    };

    const passwordStrength = getPasswordStrength(newPassword);

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold font-['Poppins',sans-serif]" style={{ color: 'var(--text-primary)' }}>
                Change Password
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                <AdminFormField label="Current Password" required>
                    <AdminInput
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter your current password"
                        autoComplete="current-password"
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Verify your identity by entering your current password.
                    </p>
                </AdminFormField>

                <AdminFormField label="New Password" required>
                    <AdminInput
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        autoComplete="new-password"
                    />
                    {newPassword && (
                        <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                                <span style={{ color: 'var(--text-secondary)' }}>Password Strength:</span>
                                <span style={{ color: passwordStrength.color, fontWeight: 600 }}>
                                    {passwordStrength.strength}
                                </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--bg-elev-1)' }}>
                                <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{
                                        width: `${passwordStrength.percentage}%`,
                                        background: passwordStrength.color,
                                    }}
                                />
                            </div>
                        </div>
                    )}
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Minimum 8 characters. Use a mix of letters, numbers, and symbols for better security.
                    </p>
                </AdminFormField>

                <AdminFormField label="Confirm New Password" required>
                    <AdminInput
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        autoComplete="new-password"
                    />
                </AdminFormField>

                <div className="rounded-lg border p-4" style={{ background: 'var(--bg-elev-1)', borderColor: 'var(--divider)' }}>
                    <div className="flex gap-3">
                        <Lock className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--brand)' }} />
                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                                Security Note
                            </p>
                            <p>
                                After changing your password, you will be automatically logged out and will need to sign in again
                                with your new password.
                            </p>
                        </div>
                    </div>
                </div>

                <AdminButton type="submit" disabled={loading || !currentPassword || !newPassword || !confirmPassword}>
                    {loading ? 'Updating...' : 'Change Password'}
                </AdminButton>
            </form>
        </div>
    );
}
