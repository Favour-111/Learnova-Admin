# Learnova Admin

Next.js + TypeScript + Tailwind CSS dashboard for managing Learnova without
touching source code. This is a separate deployable app  it never touches
MongoDB directly, only `../backend` over HTTP via `NEXT_PUBLIC_API_URL`.

## Setup

```bash
cp .env.example .env.local   # point NEXT_PUBLIC_API_URL at your running backend, add Clerk keys
npm install
npm run dev   # http://localhost:3000
```

Sign in with the **same Clerk project** the mobile app uses. The backend's
`requireAdmin` middleware checks `role === "admin"` on the matching Mongo
`User` document. That document is normally created by the Clerk webhook 
but a webhook can't reach `localhost`, so in local dev nothing syncs unless
you tunnel it. Instead, the backend lazily provisions the Mongo user (via
Clerk's API) the first time it sees a valid session for a `clerkId` it
doesn't recognize  so:

1. Sign in to the admin panel once (you'll land on the dashboard with a
   `403`  that's expected, your account exists now but isn't admin yet).
2. Promote it:
   ```bash
   # from backend/
   mongosh "$MONGODB_URI" --eval 'db.users.updateOne({email: "you@example.com"}, {$set: {role: "admin"}})'
   ```
3. Refresh the admin panel.

## What's implemented vs. stubbed

**Implemented:** full CRUD for Categories, Courses (with publish toggle),
Modules, Lessons (YouTube URL → video ID extraction), Quizzes, Questions,
Projects (configurable rubric weights), Achievements; read-only views for
Users (with role promotion), Submissions, Certificates, Leaderboard,
Notifications; a Dashboard/Analytics summary; and the public certificate
verification page at `/verify/[certificateId]` (linked from certificate QR
codes).

**Stubbed:** the Settings page documents where AI-tutor/evaluation
instructions and XP/Credit rules currently live (as backend code, not an
editable form) rather than providing one  see
`backend/src/config/gamification.ts` and `backend/src/services/openai.ts`.
An AI Evaluations detail view isn't built (the `GET /api/admin/evaluations`
endpoint exists on the backend if you want to add one).

## Notes on the stack

- Runs on **Next.js 16** (bumped up from an initial 14.2.5 pin after
  `npm audit` flagged real CVEs in that line, including a middleware
  auth-bypass advisory relevant to this app since page access is gated in
  `proxy.ts`). Next.js 16 renamed the `middleware.ts` file convention to
  `proxy.ts`  that rename is already applied here.
- Runs on **`@clerk/nextjs` v7** ("Core 3"). The initial v5 pin doesn't
  support Next.js 16 at all  it throws `Clerk: auth() and currentUser()
  are only supported in App Router` at runtime the moment anything touches
  auth, because Clerk v5 can't find the request context Next 16 exposes.
  v7 fixed that; two APIs changed in the process, already applied here:
  `auth().protect()` → `auth.protect()` in `proxy.ts` (the `auth` passed
  into `clerkMiddleware` now carries `.protect` directly, and it's async),
  and `<UserButton afterSignOutUrl="...">` → the prop moved to
  `<ClerkProvider afterSignOutUrl="...">` in `app/layout.tsx` (`UserButton`
  no longer accepts it). `npm audit` is clean (0 vulnerabilities) on this
  combination.
- Clerk logs a deprecation warning on boot: `createRouteMatcher` is
  deprecated in favor of putting `auth.protect()` / role checks directly in
  each page, layout, or route handler, since path-based middleware
  matching can diverge from actual Next.js routing. `proxy.ts` still works
  today, but the backend's `requireAuth` + `requireAdmin` on every
  `/api/admin/*` call is what actually enforces access  `proxy.ts` here is
  a UX convenience (redirect signed-out users to `/sign-in`), not the
  security boundary. Worth migrating to resource-based checks before this
  goes to production; not done here to keep the diff focused.
- `npm run build` (Next.js production build, Turbopack) is a good
  smoke test after dependency bumps  it exercises the real Clerk runtime
  path and type-checks route params in ways plain `tsc --noEmit` doesn't
  catch.
