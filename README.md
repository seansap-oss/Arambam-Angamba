# Battle of Imphal 1944

An ivory, vermilion and editorial-serif portfolio for museum work and heritage journeys in Northeast India.

## Production

The Vercel project builds `website/` in `seansap-oss/Arambam-Angamba`. `vercel.json` routes the React site and same-origin `/api` gateway. The gateway calls the dedicated `imphal-api` Supabase Edge Function.

The user selected the existing Supabase project after the free-project limit blocked a separate project. All website records use dedicated `imphal_` tables and the `imphal-media` storage bucket. Existing application tables are not changed. RLS blocks public table access; the Edge Function enforces administrator sessions, validation, moderation and rate limits. No database secrets are bundled into the frontend or Vercel source.

## Features

- Exact website title and revised biography with subtle engineering background and continuing museology study.
- Responsive Japandi layout using original repository photographs, with clearly identified illustrative landscape/still-life hero images.
- Swipeable mixed-media hero with previous/next, pause, 3/4/6/8-second image intervals, and a 3-second muted video countdown. MP4 and YouTube playback advance on completion. Reduced-motion and offscreen pausing supported.
- `/admin`: edit story, upload images/MP4, add YouTube URLs, reorder hero and gallery, manage tours and unavailable dates, review bookings, moderate guestbook, set a donation link and change password.
- Tour requests are pending until the guide confirms them. A database uniqueness rule prevents two confirmed bookings on one date. Dates use Asia/Kolkata.
- Public guestbook entries require moderation.
- Direct signed media uploads support JPG, PNG, WebP and MP4 up to 50 MB.

## Local development

Node 20+ and Python 3.10+:

```sh
npm ci
npm run dev -- --port 4173
```

Local development uses the Python/SQLite backend, isolated from the production database. Its initial administrator password is generated in `data/admin-access.txt`; this directory must never be committed. Production admin access is delivered privately. Change the password in Admin → Settings.

```sh
npm run build
npm test
npm run test:backend
npm run test:sites
```

## Backend updates

The deployed Edge Function source is in `supabase/functions/imphal-api/`. Its `verify_jwt` setting is false because it implements its own hashed administrator session authentication and includes public read/submission endpoints. All privileged operations require a valid session. Deploy function updates separately from Vercel. Schema reference: `database/schema.sql`.

Production content is persisted in Supabase. Editing `server/defaults.json` changes only the defaults for new local databases; use `/admin` to change live content.

## Owner setup remaining

- Add the actual payment-provider donation URL in Admin → Settings. Contributions are closed until configured.
- Add the owner's contact email in Settings.
- Email/SMS notifications and external calendar sync are not configured. Booking requests appear in the admin studio; confirming one does not email the visitor automatically.
- YouTube autoplay can be restricted by browser policies; a visible play fallback is provided. Start-muted playback is intentional.

The original static source and photographs remain at repository root for reference. The active deployable application is `website/`.
