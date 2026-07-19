import React from 'react';

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
  diffValue?: string | React.ReactNode;
}

export function AdminFormField({ label, children, required, className = '', diffValue }: FormFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label>
        {label}{required && <span className="text-[var(--destructive)]"> *</span>}
      </Label>
      {children}
      {diffValue !== undefined && (
        <div className="mt-1 text-xs px-2.5 py-1.5 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20">
          <span className="font-bold uppercase tracking-wider text-[10px] mr-1 opacity-80">Before:</span> 
          <span className="break-words">{diffValue}</span>
        </div>
      )}
    </div>
  );
}

export function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <label
      className={`block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] ${className}`}
    >
      {children}
    </label>
  );
}

interface AdminInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  value?: string | number | readonly string[];
  placeholder?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  type?: string;
  disabled?: boolean;
}

export function AdminInput({ className = '', ...props }: AdminInputProps) {
  const value = props.value === null ? "" : props.value;
  return (
    <input
      {...props}
      value={value}
      className={`w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all border focus:ring-2 ${className}`}
      style={{
        background: 'var(--bg-elev-1)',
        borderColor: 'var(--divider)',
        color: 'var(--text-primary)',
        '--tw-ring-color': 'var(--brand)',
      } as React.CSSProperties}
    />
  );
}

interface AdminTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
  value?: string | number | readonly string[];
  placeholder?: string;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
  rows?: number;
}

export function AdminTextarea({ className = '', ...props }: AdminTextareaProps) {
  const value = props.value === null ? "" : props.value;
  return (
    <textarea
      {...props}
      value={value}
      className={`w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all border focus:ring-2 resize-y min-h-[80px] ${className}`}
      style={{
        background: 'var(--bg-elev-1)',
        borderColor: 'var(--divider)',
        color: 'var(--text-primary)',
        '--tw-ring-color': 'var(--brand)',
      } as React.CSSProperties}
    />
  );
}

interface AdminSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
  children?: React.ReactNode;
  value?: string | number | readonly string[];
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
}

export function AdminSelect({ className = '', children, ...props }: AdminSelectProps) {
  const value = props.value === null ? "" : props.value;
  return (
    <select
      {...props}
      value={value}
      className={`w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all border focus:ring-2 ${className}`}
      style={{
        background: 'var(--bg-elev-1)',
        borderColor: 'var(--divider)',
        color: 'var(--text-primary)',
        '--tw-ring-color': 'var(--brand)',
      } as React.CSSProperties}
    >
      {children}
    </select>
  );
}

interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive';
  children?: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

export function AdminButton({ variant = 'primary', className = '', children, ...props }: AdminButtonProps) {
  const styles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'linear-gradient(135deg, var(--brand), var(--brand-strong))',
      color: 'var(--primary-foreground)',
    },
    secondary: {
      background: 'var(--bg-elev-1)',
      color: 'var(--text-primary)',
      border: '1px solid var(--divider)',
    },
    destructive: {
      background: 'var(--destructive)',
      color: 'white',
    },
  };

  return (
    <button
      {...props}
      className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer inline-flex items-center justify-center gap-2 ${className}`}
      style={styles[variant]}
    >
      {children}
    </button>
  );
}

export function StatusBadge({ status, active }: { status?: string; active?: boolean }) {
  const isActive = active ?? (status === 'published' || status === 'active' || status === 'approved');
  return (
    <span
      className="px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1"
      style={{
        background: isActive
          ? 'color-mix(in srgb, #10B981 15%, transparent)'
          : 'color-mix(in srgb, #F59E0B 15%, transparent)',
        color: isActive ? '#10B981' : '#F59E0B',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />
      {status || (isActive ? 'Active' : 'Inactive')}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, description }: { icon: React.ComponentType<any>; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--chip-bg)' }}
      >
        <Icon className="w-7 h-7" style={{ color: 'var(--text-secondary)' }} />
      </div>
      <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{description}</p>
    </div>
  );
}

export function AdminToggle({ 
  checked, 
  onChange, 
  label, 
  description 
}: { 
  checked: boolean; 
  onChange: (val: boolean) => void; 
  label: string; 
  description?: string; 
}) {
  return (
    <div className="flex items-start gap-4">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-2 ${
          checked ? 'bg-[var(--brand)]' : 'bg-[var(--bg-elev-2)]'
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
      <div className="flex flex-col mt-0.5">
        <span className="text-sm font-semibold text-[var(--text-primary)]">{label}</span>
        {description && (
          <span className="text-sm text-[var(--text-secondary)] mt-0.5">{description}</span>
        )}
      </div>
    </div>
  );
}
