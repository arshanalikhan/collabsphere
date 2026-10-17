# CollabSphere: Saranda Build-a-Thon '26 (Theme 02)

[![CI](https://github.com/arshanalikhan/collabsphere/actions/workflows/ci.yml/badge.svg)](https://github.com/arshanalikhan/collabsphere/actions/workflows/ci.yml)

A cross-house and regional meetup engine for IITM BS houses. Students find peers near them, houses (with societies) propose and co-host meetups, and attendees prove they showed up with a rotating QR code and an optional face check, earning points for their house.

**Live:** https://collabsphere-one.vercel.app · **Slides:** https://collabsphere-one.vercel.app/slides.html · **Demo video:** https://collabsphere-one.vercel.app/demo.webm

**Stack:** Next.js 15 App Router (Server Components, Server Actions, Route Handlers) · MongoDB Atlas + Mongoose · Leaflet/OpenStreetMap · Auth.js (Google) · MediaPipe (in-browser face check) · Vercel (Mumbai, `bom1`)

## For judges: try it in 3 minutes
Demo mode is on in the live app. Use the **dropdown at the top right** to switch accounts, with no password needed:

| Account | Role | What to try |
|---|---|---|
| `member-1` | Saranda member, Lucknow | Map with peers by city, RSVP, add to calendar, share on WhatsApp, check in, profile badges |
| `lucknow-coord` | Saranda coordinator | Propose an event with a co-host house and partner society; show the rotating check-in QR |
| `saranda-admin` | Saranda admin | **Admin** tab: approvals, edit/cancel events, attendee list + CSV, members (roles, house moves, points), check-in audit with revoke |
| `kaziranga-admin` | Kaziranga admin | Approve a joint event from the other house |

Suggested walkthrough:
1. **`lucknow-coord`** → *Propose*: a joint event with Kaziranga as co-host. "Use my current location as the venue" makes the check-in step work wherever you are.
2. **`saranda-admin`** → *Admin → Approvals* → approve. The event page shows it is still waiting for Kaziranga.
3. **`kaziranga-admin`** → approve. The event is now live on the map.
4. **`lucknow-coord`** → open the event: the check-in QR rotates every 30 s.
5. On a phone, **`member-1`** → *Check in* → scan the QR. Location is checked against the venue (within 500 m), points go to Saranda, and the profile shows the attendance and a badge.
6. **`saranda-admin`** → *Admin → Events → Attendees* (download the CSV) and *Check-ins* (revoke one: the points reverse).

The face check runs on its own at `/facecheck-demo`.

## What it covers (Theme 02 brief)
| Brief | CollabSphere |
|---|---|
| Discover nearby peers | Map bubbles per city (counts and houses only) and a "Peers near you" list within 150 km. Locations are rounded to about 1 km and peers only see your city. |
| Interactive regional map | Leaflet map of live meetups, co-working sessions and joint events. Each event has Google Calendar, `.ics`, WhatsApp share and directions. |
| Joint-event host manager (houses and societies) | Coordinators propose events with co-host houses and partner societies. The event goes live only when an admin from **every** host house approves; an admin's own house approves automatically. Admins can edit, cancel or restore events. |
| Proof-of-presence check-in | HMAC-signed QR rotating every 30 s, a 500 m geofence, one check-in per person, and an optional per-event liveness face check (MediaPipe in the browser; only a small thumbnail is kept, deleted after 30 days). |
| Recognition for showing up | House points and leaderboard, top members, attendance history and badges on the profile (First check-in, Regular, Explorer, Bridge builder, Organiser). |
| Admin workflows | Approvals queue, inline event editing, cancel/restore, per-event attendees with CSV export, member roles, house moves and point adjustments, check-in audit with revoke (points reverse). All scoped to the admin's own house. |

## Architecture
```mermaid
flowchart LR
  subgraph Browser
    RSC[Server-rendered pages]
    CC[Client components<br/>map · QR scanner · face check · forms]
  end
  subgraph Next.js on Vercel
    SC[Server Components<br/>read MongoDB directly]
    SA[Server Actions<br/>admin + profile mutations]
    RH[Route Handlers /api<br/>events · approve · RSVP · QR · check-in · ics · CSV]
    LIB[lib/<br/>auth & roles · approvals · QR HMAC · IST time · badges · calendar]
  end
  DB[(MongoDB Atlas)]
  G[Google OAuth]
  RSC --> SC
  CC --> RH
  CC --> SA
  SC --> LIB
  SA --> LIB
  RH --> LIB
  LIB --> DB
  SC -. Auth.js .-> G
```

```
web/
  app/
    page.js               Map + upcoming events + peers by city (Server Component)
    events/[id]/          Event detail: RSVP, calendar, share, directions, rotating host QR
    propose/              Proposal form (co-host houses, partner societies, venue from GPS)
    checkin/              QR scanner + geolocation (+ face check when required)
    leaderboard/          9 houses ranked + top members
    profile/              House, city, approximate location, badges, attendance
    admin/                Approvals, events (edit/cancel/attendees), members, check-ins
    api/                  Route handlers (JSON, .ics, CSV)
    actions.js            Server Actions
    error.js, not-found.js
  lib/                    db, models, auth/roles, approvals, QR signing, IST time, badges, calendar
  components/             Client components
  scripts/                seed.mjs (demo data), refresh-demo-dates.mjs
  tests/                  unit.test.mjs (node:test), e2e.mjs (full lifecycle against a running app)
```

## Key design decisions
- **Multi-house approval:** a joint event goes live only after an admin from every host house approves. Approvals are idempotent and only apply to pending proposals.
- **Proof of presence:** QR tokens are `eventId.slot.HMAC` and rotate every 30 s, so a screenshot stops working. The server also checks the 500 m geofence and that each person checks in once, and rejects tampered tokens. Revoking a check-in reverses its points.
- **Fair points:** members choose their own house only until they earn points, so points can't be carried to another house. After that, a house admin moves them, which resets any house role. Students without an allotted house can still join.
- **Privacy:** locations are rounded to about 1 km, and the map shows per-city counts only. Selfies are visible only to host-house admins and are purged after 30 days.
- **Security:** Google sign-in limited to IITM domains, with admins bootstrapped from env. Role and house scoping is enforced on every route and action. The demo switcher only impersonates the five seeded demo accounts.
- **One timezone:** event times are entered and shown in IST everywhere, so the UTC server and students' browsers always agree.

## Run locally
Needs MongoDB, either local or an Atlas URI in `web/.env.local`.

```bash
cd web
cp .env.example .env.local
npm install
npm run seed
npm run dev
```
Open http://localhost:3000 and switch between demo users with the dropdown in the top right.

### Tests
```bash
npm test                                   # unit tests (no database)
MONGO_DB=collabsphere_test npm run seed    # seed a throwaway database
MONGO_DB=collabsphere_test npm run dev     # in another terminal
npm run test:e2e                           # full lifecycle: propose → approve → RSVP → QR check-in → CSV
```
CI (GitHub Actions) runs the unit tests, a production build, and the end-to-end suite against a MongoDB service on every push.

### Google sign-in setup
1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), go to **Create credentials → OAuth client ID → Web application**.
2. Add the authorized redirect URIs `http://localhost:3000/api/auth/callback/google` and `https://<your-vercel-app>/api/auth/callback/google`.
3. Put the client ID and secret in `.env.local` as `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`. Set `AUTH_SECRET` (generate it with `npx auth secret`).
4. `ALLOWED_EMAIL_DOMAINS` limits sign-in to IITM student accounts. `ADMIN_EMAILS` makes the listed organisers admins the first time they sign in.

New users pick a house and city on their profile. `DEV_AUTH=true` shows the demo-account switcher; turn it off for real use.

### Deploy
Import `web/` into Vercel, add the MongoDB Atlas integration (it sets `MONGODB_URI`) and the env vars from `.env.example`, then deploy. `npm run demo:refresh -- --apply` moves the demo events to upcoming dates without touching other data.
