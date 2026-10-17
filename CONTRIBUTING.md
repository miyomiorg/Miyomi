# Contributing to Miyomi

Thanks for your interest in contributing! Miyomi is a community-maintained
directory of manga, anime, and light novel apps, extensions, and guides.

## Ways to contribute

- **Submit an entry** — use the [Contribute page](https://miyomi.app/contribute)
  on the website (preferred) or open an [issue](https://github.com/miyomiorg/Miyomi/issues).
- **Report problems** — broken links, outdated info, or bugs: open an issue with
  as much detail as possible.
- **Code** — pick up an issue or improve the UI/infrastructure.

## Development

Everything you need to run and modify the project locally is in
[DEVELOPERS.md](DEVELOPERS.md): prerequisites, configuration, database setup,
commands, and deployment.

Before opening a pull request:

```bash
npx tsc -p tsconfig.worker.json   # worker typecheck (0 errors)
npx tsc -p tsconfig.app.json      # frontend typecheck (0 errors)
npm run build                     # production build
npm run verify:worker             # API suite (needs a running local Worker)
```

## Guidelines

- Follow the existing code style and the conventions in
  [AGENTS.md](AGENTS.md).
- Never commit secrets: `.env`, `.dev.vars`, and database dumps are gitignored.
  Server secrets live in Cloudflare (`wrangler secret`).
- Keep pull requests focused and small; describe what changed and why.
- This project is licensed under the **AGPL-3.0** (see [LICENSE](LICENSE)).
  Your contributions are licensed under the same terms.

## Community

- [Discord](https://discord.gg/hfYtH9hrRm)
- [Telegram](https://t.me/iitachiyomi)
