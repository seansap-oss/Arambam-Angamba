# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Approved project decisions
- Website title is exactly Battle of Imphal 1944.
- Preserve the selected ivory, vermilion, editorial Japandi design; no redesign.
- Biography leads with continuing curiosity, preservation and museology study. Engineering is background, not the headline. No name, university or unprovided credentials invented.
- Hero controls stay below the media, including on mobile. Default image interval 4s; user can select 3/4/6/8s. Video countdown 3s, muted start, progress only after video ends. Respect pause and reduced motion.
- /admin manages content/media/gallery, tour dates/requests, guestbook moderation, donation link and password.
- Local development uses Python/SQLite. Production on Vercel uses the same-origin API gateway and the imphal-api Supabase Edge Function with isolated imphal_ tables and imphal-media bucket. The user authorized sharing the existing Supabase project after the free-project limit blocked a new one. Never modify the other application tables.
- Never commit data/, generated initial passwords or session data. Preserve existing database and uploads when updating.
