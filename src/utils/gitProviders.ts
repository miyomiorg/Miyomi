import { Github, Gitlab, Code2, Database } from 'lucide-react'; // Using generic icons for unsupported ones if needed, or we can use custom SVGs. Wait, Lucide has Github, Gitlab, Bitbucket (maybe). Let's check.

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

export function getProviderIcon(provider: GitProvider) {
    switch (provider) {
        case 'GitHub':
            return Github;
        case 'GitLab':
            return Gitlab;
        default:
            return Code2;
    }
}
