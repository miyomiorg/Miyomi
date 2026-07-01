import { Construction, Github, MessageSquare, X } from 'lucide-react';
import { useState } from 'react';

interface DevBannerProps {
    /** What section/page is under development */
    section?: string;
    /** GitHub repo path (e.g. "miyomiorg/Miyomi") */
    repo?: string;
    /** Whether the banner can be dismissed */
    dismissible?: boolean;
}

export function DevBanner({
    section = 'This section',
    repo = 'miyomiorg/Miyomi',
    dismissible = true,
}: DevBannerProps) {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    return (
        <div
            className="relative rounded-xl overflow-hidden"
            style={{
                background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(251,191,36,0.04))',
                border: '1px solid rgba(245,158,11,0.2)',
            }}
        >
            <div className="flex items-start gap-3 px-4 py-3">
                <Construction
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
                    style={{ color: '#f59e0b' }}
                />
                <div className="flex-1 min-w-0">
                    <p
                        className="font-['Inter',sans-serif] text-sm"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        <span className="font-semibold">{section}</span>{' '}
                        <span style={{ color: 'var(--text-secondary)' }}>
                            is under active development. Content may be incomplete or change frequently.
                        </span>
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                        <a
                            href={`https://github.com/${repo}/issues/new?labels=feedback&title=[Feedback]+${encodeURIComponent(section)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all hover:scale-[1.02]"
                            style={{
                                background: 'rgba(245,158,11,0.12)',
                                color: '#fbbf24',
                                border: '1px solid rgba(245,158,11,0.2)',
                            }}
                        >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Send Feedback
                        </a>
                        <a
                            href={`https://github.com/${repo}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all hover:scale-[1.02]"
                            style={{
                                background: 'var(--bg-elev-2)',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--divider)',
                            }}
                        >
                            <Github className="w-3.5 h-3.5" />
                            Contribute
                        </a>
                    </div>
                </div>
                {dismissible && (
                    <button
                        onClick={() => setDismissed(true)}
                        className="p-1 rounded-md transition-colors hover:bg-[var(--bg-elev-2)]"
                        style={{ color: 'var(--text-secondary)' }}
                        title="Dismiss"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}
