# Club Victorina

React + TypeScript venue visits and a staff visit desk for Club Victorina, Lipa City, Batangas. Vite, Tailwind v4, Firebase, React Hook Form, Zod and Motion. Original pages are preserved in `legacy/`; never deploy that folder because its admin page renders untrusted HTML.

## Run locally

Use Node 22.12+ (Node 22 LTS is used in CI).

```sh
npm ci
cp .env.example .env
# Fill .env with your Firebase web app configuration.
npm run dev
```

Public page: `http://127.0.0.1:5173/`. Booking: `/#/book`. Admin: `/#/admin` (HashRouter supports GitHub Pages without rewrites).

Without Firebase configuration the site renders an explicit preview with booking disabled. No fake booking success or browser-only reservations. The catalog starts unpublished; an authenticated admin must initialize it.

```sh
npm run lint
npm test
npm run build
npm run preview
```

## One-time Firebase setup

1. Use your existing Firebase project to retain `reservations`. Under Project settings > Your apps, copy the web app config to the matching `VITE_FIREBASE_*` values. All Vite values are public client configuration; never put service-account credentials in them.
2. Authentication > Sign-in method: enable Email/Password. Authentication > Users: create the staff user and copy their UID.
3. Firestore Database > Rules: paste `firestore.rules`, then **Publish**. Alternatively run `npx firebase login` and `npx firebase deploy --only firestore:rules --project YOUR_PROJECT_ID` from this directory. Publishing replaces existing rules; review other collections if this project is shared with another app.
4. Firestore > Data: create `admins/{STAFF_UID}` with `role: "admin"`. The document ID must exactly match the Auth UID. Any existing document in this collection grants admin access. Bootstrap the first admin through the console; public users cannot grant themselves access.
5. Sign in at `/#/admin`, open **Services & hours**, and select **Publish initial visit schedule**. Review the assumed complimentary 60-minute visits and 9 AM–9 PM daily hours before accepting bookings. Set real durations, prices, active services and blocked dates there.
6. Authentication > Settings > Authorized domains: add `localhost`, `127.0.0.1` if used locally, and `charlespura.github.io` (or your own `<username>.github.io`).
7. Verify the email `events@clubvictorina.com`, actual venue capacities, location details and business hours before public launch. The supplied HTML contained the email and capacities, but they were not independently verified. Images are labelled as illustrative stock photographs, including two retained from the supplied site; replace them with actual venue photographs in `public/images/`.

Public clients can read catalog/settings and non-personal availability, and atomically create requests. They cannot read reservations, change statuses, edit schedules or access guest details. Firebase Auth and Firestore rules enforce staff permissions. Consider App Check and operational anti-abuse controls when opening public booking at scale.

## Booking model and existing data

Existing `reservations` documents are retained, including firstName, lastName, email, phone, eventType, venue, preferredDate, guestCount, message and createdAt. They appear as pending **legacy inquiries**, without an invented appointment time. Staff can cancel an inquiry or use **Schedule visit** to assign a real appointment before confirming. No destructive migration is needed. A legacy preferredDate was an event inquiry date; scheduling a visit deliberately replaces it with the visit date. Export old data first if the original event date needs to be archived separately.

New reservations add status, serviceId, venueId, slotId, startsAt, endsAt, timeZone and consent. UTC Firestore timestamps represent appointments; all displayed dates use Asia/Manila (UTC+8, no daylight saving). Existing createdAt timestamps are preserved. Status updates/reschedules add updatedAt.

`services/{id}` contains name, venueId (`ballroom`, `garden`, `salon`), duration, price (PHP), active. `settings/business` contains published, hours (Sunday-first, seven `{open,close,closed}` entries, integer hours), and blockedDates (`YYYY-MM-DD`).

`slots/{venueId}_{UTC_epoch_seconds}` contains reservationId, venueId, startsAt and endsAt only. Slots reserve a full hourly venue window even for a shorter visit; services are deliberately limited to 15/30/45/60 minutes to guarantee non-overlap. Different services for the same venue share the same lock. Cancellation releases the lock atomically; rescheduling acquires the new lock and releases the old lock in one transaction. Completed appointments keep their locks. Rules require public requests to create a matching reservation and a previously unused deterministic slot in one atomic operation. Direct writes cannot bypass the lock, business hours, blocked dates, future-date bounds or service duration.

These are **venue visit appointments**, not event rentals. Event prices and durations were absent from the old code. Rental availability and payment terms remain arranged with the events team. Calendar downloads mark the requested visit tentative.

## Deploy to GitHub Pages

No deployment YAML was supplied with the request; `.github/workflows/deploy.yml` was created for this project.

- Repository Settings > Pages > Source: **GitHub Actions**.
- Repository Settings > Secrets and variables > Actions: add `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`. Measurement ID is optional; this app does not enable analytics.
- Push to `main`, or run **Deploy to GitHub Pages** manually. The workflow checks required Firebase config, lints, runs unit tests, builds and uploads only `dist/`.
- Base is `/` for `<username>.github.io` repositories and `/<repo-name>/` otherwise. For this repo it resolves to `/BookingWithFireStore/`. Local Vite uses `process.env.VITE_BASE ?? '/'`; for a manual build use `VITE_BASE=/BookingWithFireStore/ npm run build`.
- Rules are published separately in Firebase, not by the Pages workflow. Auth users and admin documents are also manual setup.
- If you fork/rename this project, update the absolute Open Graph image URL in `index.html`.

## Verification

```sh
# Requires Java 21+; only the demo project is used.
npm run test:rules
# Uses installed Google Chrome. Set channel/executable in the config for another browser.
npm run test:e2e
# Full booking + staff workflow against local Auth/Firestore emulators:
npx firebase emulators:exec --only firestore,auth --project demo-victorina 'npx playwright test --config playwright.emulator.config.ts'
```

`npm test` runs timezone, validation and calendar tests; emulator-dependent rule tests are skipped unless the emulator is running. Rule tests exercise actual unauthenticated writes, concurrent slot transactions, blocked-date forgery and UID permissions. Browser tests capture 390/768/1440 layouts into `docs/screenshots/`. See `docs/QA.md` for observed results and limitations.

Design decisions and initial security review: `docs/DESIGN.md`. No live Firebase data or remote deployment is changed by local builds/tests.
