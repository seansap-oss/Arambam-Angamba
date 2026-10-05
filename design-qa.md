# Design QA — Battle of Imphal 1944

Result: **blocked for production handoff** by GitHub connector write permission (403 Resource not accessible by integration). No GitHub update or Vercel deployment has been claimed.

The local implementation preserves the approved ivory/vermilion palette, editorial serif type, split desktop hero, botanical detail, artifact inset, and controls below the hero. Website name and biography use the user's final corrections. Original repository portrait/gallery photographs replace invented portraits; landscape/still-life hero imagery is clearly labelled illustrative. Exact photo content therefore intentionally differs from the generated mock.

Desktop preview: 1363 × 936. Mobile preview: 390 × 844; document client width and scroll width both 390, with controls below the media. Title line breaks and mobile hero height were adjusted after initial comparison. Latest desktop capture: Battle-of-Imphal-1944-Preview.jpg.

Validation passed:
- Production build and all 7 React interaction tests.
- Local backend integration covering authentication, content persistence, booking conflict handling, moderation, validation, uploads and password rotation.
- All 4 packaging tests.
- Public browser booking and guestbook forms, gallery viewer, donation-unconfigured state, mobile menu and calendar.
- Deployed Supabase API: denied anonymous admin access; successful admin login, session, content save, booking request/confirmation/calendar availability/cancellation, guestbook pending/approval/hide, signed upload URL, logout. Synthetic records removed.

Not yet verified: Vercel gateway/build/runtime on a deployed website, authenticated admin through the browser, actual production MP4/YouTube content, direct file transfer through a signed upload URL. No real videos or payment-provider link have been supplied. Email notifications are not configured.

Security: dedicated imphal_ tables have RLS enabled with all anon/authenticated grants revoked; service-only access is intentional. No new security error/warning was identified for these tables or the rate-limit function. The shared project has pre-existing advisor findings outside this website's scope; unrelated objects were left unchanged. Advisor reference: https://supabase.com/docs/guides/database/database-linter.
