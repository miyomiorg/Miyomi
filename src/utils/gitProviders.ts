import { Github, Gitlab, Code2, Database, Mountain } from 'lucide-react';
import { CodebergIcon } from '../components/CodebergIcon';
import { ForgejoIcon } from '../components/ForgejoIcon';

export type GitProvider = 'GitHub' | 'GitLab' | 'Codeberg' | 'Bitbucket' | 'Forgejo' | 'Gitea' | 'Other';

export function detectGitProvider(url: string | undefined): GitProvider {
    if (!url) return 'Other';
    const lowerUrl = url.toLowerCase();

    if (lowerUrl.includes('github.com')) return 'GitHub';
    if (lowerUrl.includes('gitlab.com')) return 'GitLab';
    if (lowerUrl.includes('codeberg.org')) return 'Codeberg';
    if (lowerUrl.includes('bitbucket.org')) return 'Bitbucket';
    if (lowerUrl.includes('gitea')) return 'Gitea';
    if (lowerUrl.includes('forgejo')) return 'Forgejo';

    // Some known self-hosted instances might use subdomains like git.xxx.com
    if (lowerUrl.includes('git.')) return 'Other';

    return 'Other';
}

export function resolveGitProvider(dbProvider?: string, url?: string): GitProvider {
    if (dbProvider) {
        const lower = dbProvider.toLowerCase();
        if (lower === 'github') return 'GitHub';
        if (lower === 'gitlab') return 'GitLab';
        if (lower === 'codeberg') return 'Codeberg';
        if (lower === 'bitbucket') return 'Bitbucket';
        if (lower === 'forgejo') return 'Forgejo';
        if (lower === 'gitea') return 'Gitea';
        if (lower !== 'other') return 'Other'; // Fallback
    }
    return detectGitProvider(url);
}

export function getProviderIcon(provider: GitProvider) {
    switch (provider) {
        case 'GitHub':
            return Github;
        case 'GitLab':
            return Gitlab;
        case 'Codeberg':
            return CodebergIcon;
        case 'Forgejo':
            return ForgejoIcon;
        default:
            return Code2;
    }
}
