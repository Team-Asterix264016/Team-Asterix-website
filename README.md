# Team Asterix — Autonomous Mobility & Engineering Portal

Official portal for **Team Asterix**, our institution's autonomous off-road engineering and mobility team. Built with React + Vite on the front end, Express + MongoDB on the back end, and deployed on Vercel.

Live: https://asterix-website.vercel.app

---

## Key Features & Portal Modules

- **Interactive 3D Intro & WebGL Scene**: Smooth canvas scroll-scrub sequence transitioning seamlessly into a procedural three.js 3D vehicle canvas (`Car3DCanvas`).
- **Autonomous Mobility R&D Showcase**: Full showcase of core subsystems (Software & Perception, Powertrain, Mechanical, Leads) with specifications, team galleries, and automated badge generation (`badgeImage.js`).
- **Workshop Engine & Projector Portal**:
  - **Live Attendance & Projector View**: Dynamic 12-second cycling QR code display (`WorkshopAttendanceProjector.jsx`) with real-time SSE check-ins and live statistics.
  - **Project Submissions**: Integrated submission portal for workshop participants with track filtering, project links, and admin review (`WorkshopProjectSubmissionsAdmin.jsx`).
  - **Analytics & Rush Insights**: Comprehensive breakdown of registrations by department, course, package tier, peak dates, and hourly rush analytics (`WorkshopAnalyticsGraphs.jsx`).
- **Live MCQ Quiz Engine**:
  - **Quiz Runner**: Full exam interface (`QuizRunner.jsx`) featuring anti-cheat draft autosave, timed auto-submission, gatekeeper validation, and result lookup.
  - **Quiz Management**: Admin suite (`QuizAdmin.jsx`) for scheduling quizzes, managing questions, configuring passing thresholds, and releasing scorecards.
- **Admin Control Center**: Unified brutalist admin dashboard (`AdminDashboard.jsx`) for managing site content, team members, sponsorship tiers, workshop registrations, attendance, project submissions, and quiz deployments.

---

## Running locally

```bash
npm install
npm run dev          # client on :5173 and server on :5000 concurrently
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server and Express API side by side via `concurrently` |
| `npm run dev:frontend` | Vite only — site runs with local state and bundled fallback defaults |
| `npm run dev:backend` | Express API server only |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve production build locally |
| `npm run lint` | Codebase static analysis via `oxlint` |

The backend uses `server/.env`; set `MONGODB_URI` and `JWT_SECRET`. See [BACKEND.md](./BACKEND.md) for detailed architecture and schema specifications.

---

## Engineering & Architecture

### Opening sequence

The landing page opens on the vehicle's rear, scroll-scrubs it round to face the reader, resolves into the team mark, then dissolves into the live 3D scene.

- Frames live in `public/intro/{desktop,mobile}` as WebP (80 per tier), generated via `scripts/extract-intro-frames.ps1`.
- The canvas cross-fades frames bracketing a fractional scroll position, eased in a custom rAF loop for fluid rotation.
- `IntroScrollSequence` paints frames to a fixed canvas synchronized with GSAP ScrollTrigger.
- `src/lib/introHandoff.js` smoothly blends the final intro frame directly into `Car3DCanvas`.

### Background 3D scene

`Car3DCanvas` builds the vehicle procedurally in three.js and poses it along a keyframe track driven by scroll position with frame-rate independent damping.

### Content & Data Layer

`WebsiteDataContext` manages all editable site content. It synchronizes with the MongoDB Express API (`/api/site-data`), falling back to `localStorage` and bundled defaults when offline. Media uploads are stored via ImageKit CDN and server file storage.

---

## Design System

- **Palette**: Brutalist light mode. White and `slate-900` structural bases with `sky-400`/`amber-300` accents and hard offset shadows (`shadow-brutal-4`).
- **Typography**: Plus Jakarta Sans for primary UI typography and Space Grotesk for technical telemetry labels.
- **Micro-Interactions**: Custom `press` utility classes providing physical button tactile feedback into offset shadows.
- **Reduced Motion**: Respects `prefers-reduced-motion` to halt ambient loops and WebGL idle animations for accessibility.

---

## Deployment & CI/CD

- **Production Deployment**: Vercel automatically deploys pushes to `main`.
- **Automated CI/CD**: GitHub Actions (`.github/workflows/ci.yml`) runs on every push and pull request:
  - **Frontend Job**: `npx oxlint` (correctness checks) and `npm run build` static bundle verification.
  - **Backend Job**: Syntax parsing (`node --check`), MongoDB schema bootstrap, and route import evaluations.

---

## Directory Structure

```
src/
  components/         UI components, 3D canvases, intro sequence, quiz runner
  components/admin/   Admin control dashboard, analytics graphs, attendance projector, quiz admin
  context/            WebsiteDataContext state provider
  data/               Subsystems, recruitment problem statements, static defaults
  lib/                API client, badge renderer, intro handoff channel
public/intro/         Desktop & mobile WebP intro frames
server/
  src/config/         Workshop package configuration
  src/db/             MongoDB database client
  src/models/         Mongoose schemas (SiteData, User, Quiz, Workshop, etc.)
  src/routes/         REST API endpoints
```

Outstanding tasks and roadmap items are tracked in [CHANGES-TO-BE-MADE.md](./CHANGES-TO-BE-MADE.md).

