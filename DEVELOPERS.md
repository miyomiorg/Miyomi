# Developer Guide — Miyomi

This document helps contributors understand how Miyomi works and how to get involved.

Miyomi is an open-source platform for discovering Anime, Manga, and Light Novel **apps**, **extensions**, and **guides**. It does not host content — it organizes and presents public tools in a clean, searchable way.

For a full list of changes across versions, see [CHANGELOG.md](CHANGELOG.md).

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS 4 |
| **UI Components** | Radix UI primitives, shadcn-style components |
| **Rich Text** | TipTap editor (admin) |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (Google OAuth) |
| **Hosting** | Cloudflare Pages |
| **CAPTCHA** | Cloudflare Turnstile |
| **SEO** | Cloudflare Pages Functions (edge-rendered OG images) |
| **Animations** | Motion (framer-motion) |

---

## 📁 Project Structure

```
Miyomi/
├── functions/              # Cloudflare Pages Functions (SEO edge rendering)
│   ├── [[path]].ts         # Dynamic OG meta injection for all routes
│   ├── sitemap.xml.ts      # Auto-generated sitemap
│   └── _lib/               # Shared utils (supabase client, SEO helpers)
├── scripts/                # Build & maintenance scripts
│   ├── generate-og-images.mjs   # Build-time OG image generation (satori)
│   ├── sync-donations.js        # Syncs donation data from Supabase
│   ├── backup-db.mjs            # Database backup utility
│   ├── restore-db.mjs           # Database restore utility
│   └── update-app-meta.mjs      # GitHub metadata updater
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── admin/          # Admin-specific components (forms, editors, layout)
│   │   ├── backgrounds/    # Animated background effects
│   │   ├── forms/          # Public form components
│   │   └── ui/             # Base UI kit (radix + shadcn style)
│   ├── config/             # App configuration
│   ├── context/            # React context providers (likes, etc.)
│   ├── hooks/              # Custom React hooks (data fetching, auth, etc.)
│   ├── integrations/       # Third-party integrations (Supabase client)
│   ├── lib/                # Utility libraries
│   ├── pages/              # Route pages
│   │   └── admin/          # Admin dashboard pages (28 pages)
│   ├── services/           # Data service layer (Supabase queries)
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Helper functions
├── supabase/
│   ├── functions/          # Supabase Edge Functions (serverless API)
│   └── migrations/         # Database schema & migrations
├── .env.example            # Environment variable template
├── wrangler.toml           # Cloudflare Pages configuration
├── vite.config.ts          # Vite build configuration
└── package.json
```

---

## 🌐 What the Site Does

### Public Side

- **Software** — Browse, search, filter, and sort apps (grid/list views)
- **Extensions** — Browse extension repositories with language filtering
- **Guides** — Read and submit community guides with rich content
- **Blog** — Announcements and blog posts from the team
- **Donations** — Support the project with multiple payment options
- **FAQ** — Frequently asked questions
- **Search** — Global search across all content (Ctrl+K / S shortcut)
- **Submit** — Contribute new apps or extensions (Basic & Advanced modes)
- **Like** — React to favorite entries
- **Report** — Flag problematic content for admin review

### Admin Side

Admins can:
- Review and approve/reject submissions and edit suggestions
- Create, edit, and delete apps, extensions, guides, FAQs, and blog posts
- Manage donations, notices, and themes
- View analytics, likes, reports, feedback, and bot attack logs
- Manage admin users (promote, demote, delete)
- View session logs and security alerts
- Configure endpoint toggles and Telegram notifications
- Manage compatibility groups

**Roles:**
- `admin` — Content management and moderation
- `super_admin` — Full access including user management and security

---

## 🔄 Architecture Overview

### Data Flow

All data lives in **Supabase** (PostgreSQL). The frontend talks to Supabase directly using the `@supabase/supabase-js` client with Row-Level Security (RLS) policies controlling access.

```
User → React SPA → Supabase (DB + Auth + RLS)
                  → Cloudflare Functions (SEO/OG only)
```

### Key Hooks (data fetching)

| Hook | Purpose |
|---|---|
| `useApp` / `useExtension` | Fetch single item details |
| `useGlobalSearch` | Search across apps + extensions |
| `useAuth` | Authentication state and session |
| `useAdmin` | Admin role verification |
| `useDonations` | Donation data and management |
| `useBlogPosts` / `useBlogPost` | Blog content |
| `useGitHubRelease` | GitHub release info and downloads |
| `useGitHubLastCommit` | Latest commit activity |
| `useThemeEngine` | Dynamic theme system |
| `useCachedImage` | Image caching for performance |
| `useSessionTracker` | Admin session tracking |

### Supabase Edge Functions

The backend logic runs as Supabase Edge Functions:

| Function | Purpose |
|---|---|
| `bootstrap-admin` | First-time super admin setup |
| `manage-admin` | Admin CRUD operations |
| `security-alert` | Unauthorized login detection + Telegram alerts |
| `feedback` | User feedback → Telegram notifications |
| `submit-content` | Content submission handler |
| `edit-suggestion` | Edit suggestion handler |
| `like` | Like/vote system |
| `list-apps` | Public app listing API |
| `report-content` | Content reporting handler |
| `update-app-meta` | App metadata updater |

### Cloudflare Pages Functions

These run at the edge for SEO purposes only:

| Function | Purpose |
|---|---|
| `[[path]].ts` | Intercepts requests to inject OG meta tags for social sharing |
| `sitemap.xml.ts` | Auto-generates sitemap from database content |

---

## 🔐 Security Note

> Miyomi's backend (Supabase edge functions, database schema, and migrations) lives in a **separate private repository** and is gitignored here. This was done after malicious actors attempted spam attacks, security exploits, and tried to break the site by targeting the backend.
>
> If you need backend context for your contribution, reach out to the team.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+**
- A [Supabase](https://supabase.com) account (free tier works)
- A [Cloudflare](https://cloudflare.com) account (for Turnstile CAPTCHA + Pages hosting)
- A Google Cloud project (for OAuth login)

### 1. Clone & Install

```bash
git clone https://github.com/miyomiorg/Miyomi.git
cd Miyomi
npm install
```

### 2. Environment Variables

Copy the example and fill it in:

```bash
cp .env.example .env
```

```env
# Public (exposed to client via Vite)
VITE_SUPABASE_PROJECT_ID="your-project-ref"
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
VITE_SUPABASE_ANON_KEY="your-anon-key"
VITE_TURNSTILE_SITE_KEY="your-turnstile-site-key"
VITE_EMAIL_LOGIN_ENABLED=false
VITE_REMEMBER_SESSION=false

# Server-side only (never expose these)
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
TURNSTILE_SECRET_KEY="your-turnstile-secret"
CRON_API_KEY="any-random-secret-for-cron-jobs"
TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
```

### 3. Run Locally

```bash
npm run dev
```

Opens at `http://localhost:8080` by default.

### 4. Build for Production

```bash
npm run build
```

This runs `vite build` and then auto-generates OG images via `scripts/generate-og-images.mjs`.

---

## ☁️ Deployment

Miyomi runs on **Cloudflare Pages**:

1. Connect your repo to Cloudflare Pages
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add all `VITE_*` environment variables in Cloudflare Pages settings
5. Deploy

The `functions/` directory is automatically picked up by Cloudflare Pages Functions for edge SEO rendering.

The `dist/` output also works on any static hosting (Vercel, Netlify, etc.) but you'll lose the edge SEO functions.

---

## 🗃️ Database

Content is stored in Supabase (PostgreSQL). Main table groups:

**Content:** `apps`, `extensions`, `guides`, `faqs`, `blog_posts`

**Community:** `submissions`, `edit_suggestions`, `likes`, `reports`, `feedback`, `guide_submissions`

**Admin:** `user_roles`, `admin_logs`, `admin_sessions`, `unauthorized_login_attempts`, `bot_attack_logs`

**Config:** `notices`, `themes`, `settings`, `donations`, `compatibility_groups`

Migrations are in `supabase/migrations/`. The base schema is in `00000000000000_init.sql` with incremental migrations for newer features.

---

## 🤝 How to Contribute

We welcome contributions! Here are some areas where help is appreciated:

- **UI/UX improvements** — Better layouts, animations, responsiveness
- **Performance** — Faster load times, better caching, lazy loading
- **Search** — Improved search ranking and relevance
- **Accessibility** — Screen reader support, keyboard navigation
- **Bug fixes** — Check the issues tab for known bugs
- **Data contributions** — Submit apps and extensions through the site's form
- **Documentation** — Improve this guide or add inline code docs

### Guidelines

- Keep changes clean and focused — one feature per PR
- Follow existing code style and patterns
- Test on both desktop and mobile
- Don't commit `.env` or sensitive keys
- If touching security-related code, explain your changes clearly

---

## 📨 Submission Flow

1. User fills out the Submit form (Basic or Advanced mode)
2. Cloudflare Turnstile CAPTCHA validation
3. Data sent to Supabase via edge function
4. Stored in `submissions` table as "pending"
5. Admin reviews, edits if needed, and approves or rejects
6. Approved entries go live immediately

---

## 🔒 Security Checklist

- Never expose `SUPABASE_SERVICE_ROLE_KEY` client-side
- Keep RLS policies restricting write access
- Keep CAPTCHA enabled in production
- Keep `VITE_EMAIL_LOGIN_ENABLED=false` unless explicitly needed
- Review `unauthorized_login_attempts` and `bot_attack_logs` regularly
- IP addresses are stored as SHA-256 hashes, not raw IPs

---

## 💡 Future Ideas

- Better search ranking and relevance
- Trending / popular system
- Multi-language / i18n support
- Improved duplicate detection
- Contributor recognition system
- More guide categories and content types

---

Miyomi is built by our team and shaped by community feedback. Keep changes clean, readable, and maintainable. ❤️
