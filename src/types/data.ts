

export type ContentType = 'Manga' | 'Anime' | 'Light Novel' | 'Novel' | 'Movie' | 'Comics' | 'Webtoon' | 'Multi' | (string & {});
export type Platform = 'Android' | 'iOS' | 'Windows' | 'Mac' | 'Linux' | 'Web';
export type CommunityPlatform = 'Discord' | 'GitHub' | 'Reddit' | 'Telegram' | 'Matrix';
export type WebsiteCategory = 'Manga' | 'Anime' | 'Light Novel' | 'Tracker' | 'Community';
export type GuideIcon = 'download' | 'settings' | 'book' | 'help';
export type FAQCategory = 'installation' | 'configuration' | 'extensions' | 'troubleshooting' | 'general';


export interface AppTutorial {
    title: string;
    type: 'video' | 'guide' | 'external' | 'custom';
    url: string;
    description?: string;
}

export interface AppData {
    id: string;
    slug?: string;
    name: string;
    status?: string;
    shortDescription?: string;
    description: string;
    contentTypes: readonly ContentType[];
    platforms: readonly Platform[];
    accentColor?: string;
    logoUrl?: string;
    author?: string;
    keywords?: readonly string[];
    supportedExtensions: readonly string[];
    lastUpdated?: string;
    githubUrl?: string;
    getApp?: string;
    officialSite?: string;
    discordUrl?: string;
    socialUrls?: string[];
    tutorials?: readonly AppTutorial[];
    rating?: number;
    downloads?: number;
    likes?: number;
    forkOf?: string;
    upstreamUrl?: string;
    createdAt?: string;
}


export interface ExtensionTutorial {
    title: string;
    type: 'video' | 'guide' | 'external' | 'custom';
    url: string;
    description?: string;
    manualUrl?: string;
}

export interface InstallUrl {
    label: string;
    url: string;
    type: 'auto' | 'copy';
}

export interface ExtensionData {
    id: string;
    slug?: string;
    name: string;
    info?: string;
    shortDescription?: string;
    logoUrl?: string;
    types: readonly ContentType[];
    language: string;
    accentColor?: string;
    autoUrl: string;
    manualUrl: string;
    installUrls?: InstallUrl[];
    supportedApps: readonly string[];
    lastUpdated?: string;
    overview?: string;
    github?: string;
    website?: string;
    keywords?: readonly string[];
    tutorials?: readonly ExtensionTutorial[];
    rating?: number;
    socialUrls?: string[];
    downloadCount?: number;
    likes?: number;
    createdAt?: string;
}


export interface CommunityData {
    id: string;
    name: string;
    description: string;
    members: string;
    link: string;
    color: string;
    platform: CommunityPlatform;
    keywords?: readonly string[];
    relatedAppIds?: readonly string[];
}


export interface FAQData {
    id: string;
    question: string;
    answer: string;
    keywords?: readonly string[];
    category: FAQCategory;
    relatedAppIds?: readonly string[];
    order_index?: number;
    content_format?: 'html' | 'markdown';
}


export interface GuideTopicData {
    id: string;
    title: string;
    slug: string;
    summary?: string;
    keywords?: readonly string[];
    relatedAppIds?: readonly string[];
    relatedExtensionIds?: readonly string[];
}

export interface GuideCategoryData {
    id: string;
    title: string;
    description: string;
    color: string;
    icon: GuideIcon;
    guides: readonly GuideTopicData[];
}

export interface GuideData {
    id: string;
    title: string;
    slug: string;
    content: string;
    category: string;
    description: string;
    author: string;
    readTime: string;
    tags: string[];
    relatedAppIds: readonly string[];
    relatedExtensionIds: readonly string[];
    updatedAt: string;
    summary?: string;
}


export interface WebsiteData {
    id: string;
    name: string;
    url: string;
    description: string;
    category: WebsiteCategory;
    color: string;
    keywords?: readonly string[];
}
