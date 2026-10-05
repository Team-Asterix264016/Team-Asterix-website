# Team Asterix — Autonomous Mobility & Engineering Portal

Official site for **Team Asterix**, our college's autonomous off-road engineering and mobility team. React + Vite front end, Express + `node:sqlite` back end, deployed on Vercel.

Live: https://asterix-website.vercel.app

---

## Running locally

```bash
npm install
npm run dev          # client on :5173 and API on :5000 together
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server and the API side by side |
| `npm run dev:frontend` | Vite only — the site falls back to bundled defaults and the API calls 502 |
| `npm run dev:backend` | API only |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built output |
| `npm run lint` | oxlint |

The backend needs `server/.env`; copy `server/.env.example` and set a real
`JWT_SECRET`. Node 24 or newer is required — the database layer uses the
built-in `node:sqlite` module. See [BACKEND.md](./BACKEND.md) for full backend architecture, database schema, and API documentation.

---

## How the page is built

### Opening sequence

The landing page opens on the buggy's rear, scroll-scrubs it round to face the
reader, resolves into the team mark, then dissolves into the live 3D scene.

- Frames live in `public/intro/{desktop,mobile}` as WebP, 80 per tier.
  `scripts/extract-intro-frames.ps1` regenerates them from the source clip with
  ffmpeg. The clip itself is not committed — it is large, and the frames are
  what ships.
- Playback order is the clip's own. The orbit runs rear-three-quarter (frame 1)
  → side profile (~33) → dead front (~62) → front-three-quarter (frame 80), so
  it opens on the buggy's back and turns it to face the reader. The 3D buggy is
  built nose-on-+Z with the camera at +Z, so `Car3DCanvas`'s `rotY: -0.48` hero
  keyframe is a front three-quarter — it matches frame 80, and reversing the
  sequence would land the footage 180° away from it.
- The canvas cross-fades the two frames bracketing a fractional scroll position,
  eased in its own rAF loop, so the turn reads as continuous rotation rather
  than 80 discrete stills.
- `IntroScrollSequence` paints frames to a canvas and reads scroll progress from
  a GSAP ScrollTrigger. Its stage is `position: fixed`, not `sticky`, because
  the app root and `body` both set `overflow-x: hidden`, which per spec makes
  the other axis compute to `auto` and silently breaks sticky positioning.
- The final stretch cross-dissolves into the WebGL scene rather than cutting to
  it. `src/lib/introHandoff.js` is the channel: the intro writes a 0..1 value
  and `Car3DCanvas` reads it every frame, blending from a pose framed like the
  closing video frame to its normal scroll-driven track.

### Background 3D scene

`Car3DCanvas` builds the buggy procedurally in three.js — no model file — and
poses it along a keyframe track sampled by scroll position, smoothed with
frame-rate independent damping. Orientation comes from scroll only; the cursor
contributes a small positional drift and nothing else, so the vehicle can never
be rotated into an angle the choreography was not composed for.

Camera fov widens as the viewport narrows. A `PerspectiveCamera`'s fov is
vertical, so without that compensation a tall phone screen blows the vehicle up
until it swamps the hero copy.

### Section reveals

`useScrollAssembly` reveals annotated elements once as they enter the viewport.
Mark elements with `data-assemble="header" | "left" | "right" | "card" | "up" |
"down" | "pop" | "stagger"`.

Reveals are one-shot by design. They do not reverse on scroll-up, and nothing is
left hidden if the hook bails out.

### Content and admin

`WebsiteDataContext` holds all editable site content. It connects directly
to the Node / Express backend API (`/api/site-data`), falling back to `localStorage`
and bundled defaults when offline. The admin dashboard is at `#admin`.
Media uploads go to ImageKit CDN / server storage.


---

## Design system

- **Palette** — light. White and `slate-900` for structure, `sky-500`/`sky-600`
  for accent, amber for highlights. Hard 2–4px borders with offset shadows.
- **Type** — Plus Jakarta Sans for everything, Space Grotesk for technical and
  telemetry labels. Both are wired through `--font-sans` / `--font-mono` in
  `@theme`, not just on `body`; Tailwind's `font-sans` utility would otherwise
  override the body rule and drop the page to system fonts.
- **Motion** — one easing curve (`--ease-brutal`) and three durations
  (`--dur-fast` 120ms, `--dur-base` 220ms, `--dur-slow` 400ms) in
  `src/index.css`.
- **Press feedback** — interactive surfaces carry `press` (and `press-sky`,
  `press-flat`, `press-y`, `press-xy` where positioning demands it), so
  everything clickable sinks into its own offset shadow.
- **Icons** — `src/components/Icon.jsx`, monochrome, inheriting `currentColor`.
  No colour emoji in the UI. The typographic marks `✦ ★ → ✕` are part of the
  design language and stay.
- **Reduced motion** — `prefers-reduced-motion` stops the ambient loops, the
  card rotation, the WebGL idle animation and the scroll reveals.

---

## Deployment

Vercel builds and deploys automatically on every push to `main`. There is no
`vercel.json`; the project is configured in the Vercel dashboard.

GitHub Actions (`.github/workflows/ci.yml`) runs on every push and pull request:
lint and build for the front end, plus a parse and schema-boot check for the
backend. The lint step gates on the `correctness` category.

The backend is **not** deployed. In production `/api/site-data` fails and the
site falls back to bundled defaults, so admin edits do not persist. See
[CHANGES-TO-BE-MADE.md](./CHANGES-TO-BE-MADE.md) §1.2.

---

## Layout

```
src/
  components/         UI, 3D canvases, intro sequence
  components/admin/   Admin dashboard
  context/            WebsiteDataContext
  hooks/              useScrollAssembly
  lib/                introHandoff channel
  data/               subsystem content
public/intro/         extracted intro frames
scripts/              frame extraction
server/               Express API, SQLite, uploads
```

Outstanding work is tracked in [CHANGES-TO-BE-MADE.md](./CHANGES-TO-BE-MADE.md).
