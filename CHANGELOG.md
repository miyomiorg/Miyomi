# 📋 Changelog

All notable changes to **Miyomi** are documented in this file.

Miyomi is a community-driven project — it will keep evolving. We use `v0.x` versioning to reflect that.

> **How to read this changelog:**
> Each version lists changes grouped by category. Dates reflect the development period, not a single release day.
>
> Want to contribute? Check out our [Contributing Guidelines](CONTRIBUTING.md) and join our [Discord](https://discord.gg/miyomi).

---

## [v0.4] — The Community Platform Update 🚀
**Development Period:** June 2026

### Added
- **Blog & Announcements System** — Full blog management with public feeds, admin editor with auto-save, and a premium two-column desktop layout with sticky sidebar
- **SEO & Open Graph** — Edge rendering and build-time OG image generation via Cloudflare Pages, dynamic OG layouts with WebP support
- **Community Guide Submissions** — Users can now submit guides for review; overhauled guide system with HTML rendering and iframe video player support
- **User Reporting & Moderation** — Report system with admin dashboard, device fingerprinting, and trust scores
- **Compatibility Groups** — New system to group compatible apps and extensions together
- **App Status Backgrounds** — Interactive status indicators with admin controls
- **Privacy & Submission Policies** — New dedicated policy pages

### Changed
- **Mobile-First Redesign** — Complete homepage overhaul with app grid, live search, bottom slide-in menu drawer, auto system theme detection, and safe-area-inset support
- **Desktop Navigation** — Refactored to clean segmented style with icons; responsive collapsing for smaller screens
- **Home Page** — Refactored desktop layout, moved from cards to quote disclaimer design, added card scale-up animations
- **Cards & Listings** — Standardized tag badges, consistent card heights, removed clutter (fork indicators, view buttons), compact design
- **Search** — Grid/list toggle, Ctrl+K override, global modal trigger from homepage, glassmorphic blur, persistent view preference
- **Theme System** — Smooth crossfades, mobile-optimized toggle, dark mode migrated from navy blue to neutral dark gray for GPU performance
- **Loading** — Replaced slow full-screen preloader with instant-render top progress bar; mascot preloader animation; app logo caching
- **Contribution Flow** — Shared admin forms on public contribute page; Basic and Advanced modes; streamlined feedback panel
- **Donations** — Complete UI/UX overhaul for both public and admin views
- **Admin Dashboard** — Network activity dashboard, unified review forms, automated DB cleanup, raw JSON theme builder, multiple git provider support, centralized CORS, upgraded analytics
- **About Page** — Credited Wotaku Wiki & EverythingMoe; streamlined with external tutorial support

### Fixed
- Infinite back loop on app/ext and edit forms
- React Error #310 (wrapped navigation in `startTransition`)
- Cloudflare infinite 308 redirect loop
- Build-time data fetching for Cloudflare Pages deployments
- Iframe stripping and DOMPurify configs in guides
- Git Provider overriding in admin forms
- Admin login issues with Google OAuth
- Search sorting for dateless items
- Form crashes with Last Updated overrides
- Dynamic CORS image previews and color extraction
- Edit suggestion page crashes and submission validation
- Mobile keyboard overlap on search
- Footer responsiveness on mobile

### Security
- Replaced raw IP storage with SHA-256 hashes
- Rewrote privacy policy for better transparency

---

## [v0.3] — The Database Revolution 🗄️
**Development Period:** February – May 2026
**Branch:** `main` (current production)

### Added
- **Supabase Integration** — Migrated entire data layer from static JSON files to Supabase (PostgreSQL)
- **Authentication** — Supabase auth with `useAuth` hook, session persistence, Google OAuth, protected routes, session tracking, and security alerts
- **Admin Dashboard** — Full CRUD for apps, extensions, guides, and FAQs; user management with promotion/demotion; submission review pages with type filters
- **Rich Text Editor** — TipTap-based editor with tables, highlights, custom callout/container blocks, and markdown rendering
- **Guides Section** — Category listing and detailed guide view with auto slug generation and tag management
- **FAQ System** — User-facing page with accordion Q&A and admin management interface
- **Donation System** — Public donation page with admin controls, payment details modal with branded theming, auto/manual goal toggle, sync script, quota exceeded ribbon, enhanced currency display
- **Extensions** — Multi-language selection and filtering, custom-named install buttons
- **Social** — Multiple social networks (up to 5), multi-platform community URL selector
- **Auto GitHub Downloads** — Auto-construct download URLs from GitHub releases
- **Feedback** — Pre-submit confirmation to filter off-topic submissions

### Changed
- **Software Page** — Dynamic filtering, sorting, and search with admin forms
- **Navbar & Search** — New modular components for navigation and search
- **Admin Forms** — Clickable table rows and cards for quick editing

### Fixed
- Sorting issues and sort-by-date option
- Captcha handling for login and contribute pages
- Contribute form payload issues
- RLS recursion and dashboard visibility
- Extension & software page sort alignment
- Short description auto-fill for contribute form
- Auto slug generation for guide pages
- Build configuration for Cloudflare deployment

### Documentation
- Added comprehensive DEVELOPERS.md with project setup, deployment, and security configuration guide

---

## [v0.2] — The React Rebuild ⚛️
**Development Period:** October 2025 – February 2026
**Branch:** `legacy-v2`

> **Breaking Change:** Complete ground-up rewrite. The entire codebase was rebuilt — VitePress (Vue) replaced with React 18 + Vite; all content moved from Markdown to JSON data files.

### Added
- **React 18 + Vite** — Full SPA with custom component library
- **JSON Data Layer** — `apps.json`, `extensions.json`, `guides.json`, `faqs.json`, `communities.json`, `websites.json`
- **Component Library** — 50+ components including app cards (grid/list), extension cards, navbar, search modal, theme provider, feedback panel, particle background, and a full shadcn-style UI kit
- **Pages** — Home, Software, Extensions, App Detail, Extension Detail, Guides, FAQ, About, Communities, 404
- **GitHub Integration** — Release fetching with download counts, commit history display, pre-release indicators
- **Love/Like System** — Reaction system with Cloudflare D1 backend
- **Auto Download Counter** — GitHub Actions workflow for daily download count updates
- **Search** — Modal with keyboard shortcuts, grid/list toggle, preference persistence
- **Dynamic Accent Colors** — ColorThief-derived colors from app logos
- **Seasonal Themes** — Plugin system for holiday customizations (Christmas snowfall, particle effects)
- **Platform Icons** — Android, iOS, macOS, Windows, Linux support
- **PWA** — Web app manifest with icons (192px, 512px)

### Changed
- **Tech Stack** — VitePress + UnoCSS → React 18 + Vite + custom CSS (2,900+ lines)
- **Styling** — Custom dark/light theme with glassmorphism, blur effects, and smooth transitions
- **Hosting** — Moved to Cloudflare Pages with Functions API

### Fixed
- App details page not loading
- Multiple API calls on list page
- Download counter for million+ counts
- Performance on low-end mobile devices

---

## [v0.1] — The Beginning 🌱
**Development Period:** November 2024 – October 2025

> The very first version of Miyomi. Originally forked from the open-source [Wotaku Wiki](https://wotaku.wiki), we took it in our own direction — a clean, focused platform for discovering anime/manga **apps, extensions, and guides**. Nothing else, no bloat.

- Launched **Miyomi** with custom branding, logo, and OG images
- Built with VitePress and deployed on Cloudflare
- Focused exclusively on software, extensions, and tutorial guides
- Set up community infrastructure — Discord, feedback API, social links
- Early Cloudflare Pages deployment and iteration

---

## Version History

| Version | Period | Stack | Data | Hosting |
|---|---|---|---|---|
| **v0.1** | Nov 2024 – Oct 2025 | VitePress | Markdown | Cloudflare Pages |
| **v0.2** | Oct 2025 – Feb 2026 | React 18 + Vite | JSON files | Cloudflare Pages |
| **v0.3** | Feb – May 2026 | React 18 + Vite | Supabase | Cloudflare Pages |
| **v0.4** | June 2026+ | React 18 + Vite | Supabase | Cloudflare Pages |

## Contributors ❤️

Miyomi is built by our team and shaped by our community's feedback, suggestions, and data contributions. Thank you for helping us make it better.

See the full list of contributors on [GitHub](https://github.com/tas33n/Miyomi/graphs/contributors).

---

*This changelog is maintained by the Miyomi team. If you spot something missing, open an issue or PR!*
