# CollabSphere: Saranda Build-a-Thon '26 (Theme 02)

Cross-house and regional meetup engine for IITM BS houses: discover nearby peers, propose and co-host events across houses, and earn house points through proof-of-presence check-ins.

**Live:** https://collabsphere-one.vercel.app (demo mode is on: switch users with the dropdown in the top right)

**Stack:** Next.js 15 (App Router: Server Components, Route Handlers, Server Actions) · MongoDB + Mongoose · Leaflet/OpenStreetMap · deployed as a single app on Vercel (Mumbai, `bom1`) with MongoDB Atlas

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

## Google sign-in setup
1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), go to **Create credentials → OAuth client ID → Web application**.
2. Add the authorized redirect URIs `http://localhost:3000/api/auth/callback/google` and `https://<your-vercel-app>/api/auth/callback/google`.
3. Put the client ID and secret in `.env.local` as `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`. Set `AUTH_SECRET` (generate it with `npx auth secret`).
4. `ALLOWED_EMAIL_DOMAINS` limits sign-in to IITM student accounts. `ADMIN_EMAILS` makes the listed organisers admins the first time they sign in.

New users go to their profile to pick a house and city. With `DEV_AUTH=true`, the nav also shows a demo-user switcher for the jury walkthrough.

## Architecture
```
web/
  app/
    page.js               Map + upcoming events (Server Component, reads DB directly)
    events/[id]/          Event detail, RSVP, rotating host QR
    propose/              Coordinator proposal form (co-host houses)
    checkin/              QR scanner + geolocation check-in
    leaderboard/          All 9 houses ranked
    profile/              House, city, approximate location
    admin/                Admin dashboard: approvals, events, members, check-ins (Server Actions)
    api/                  Route handlers: events, approvals, RSVP, QR, check-in, nearby peers
    actions.js            Server Actions (admin + profile mutations)
  lib/                    db connection, models, auth/roles, QR signing, shared approval logic
  components/             Client components (map, scanner, QR, forms)
  scripts/seed.mjs        Demo data
```

## Key design decisions
- **Multi-house approval:** a joint event goes live only after an admin from *every* host house approves it.
- **Proof of presence:** the host screen shows an HMAC-signed QR token that rotates every 30 s, so screenshots can't be reused. The server also checks the attendee is within 500 m of the venue and allows only one check-in per person per event. Admins can revoke a check-in, which reverses the points.
- **Privacy:** user location is rounded to about 1 km, and peers only see each other's city.
- **Scoped admin:** admins see and manage only their own house's members and events.
- **One timezone:** event times are shown and entered in IST everywhere, so the UTC server and students' browsers always agree.

## Demo flow
1. `lucknow-coord`: Propose an event with Kaziranga as co-host.
2. `saranda-admin`: Admin, then Approve. `kaziranga-admin`: Admin, then Approve. The event goes live on the map.
3. `lucknow-coord`: open the event to show the rotating QR. `member-1` scans it on the Check in page, and points go to Saranda.
4. Leaderboard and Admin, then Check-ins (revoke one to see the points reverse).

## Plan
- [x] Roles, propose → multi-house approval, RSVP, map, nearby peers
- [x] Rotating QR + geofence check-in, house points, leaderboard
- [x] Admin dashboard (approvals, event editing, member roles/points, check-in audit)
- [x] Optional face check during check-in, per event (MediaPipe in the browser: one face, head turn, back to centre; thumbnail kept for the host audit and deleted after 30 days). Try it at `/facecheck-demo` in demo mode.
- [x] Google sign-in (Auth.js), with an IITM domain restriction and admin bootstrap from env
- [x] Deploy to Vercel + MongoDB Atlas
- [ ] Saranda visual polish, demo video
