# Asterix Backend Engine

Express REST API and MongoDB Atlas database service powering the **Team Asterix** portal.

For the complete technical guide, architecture diagrams, Mongoose database schema definitions, and REST API specifications, see:
👉 **[BACKEND.md](../BACKEND.md)** in the project root.

---

## Tech Stack & Architecture

- **Runtime**: Node.js `>= 22.5.0` (Recommended: `24.x`)
- **HTTP Framework**: Express.js `4.x`
- **Database Engine**: MongoDB Atlas via Mongoose `9.x`
- **Authentication**: JWT (JSON Web Tokens) with Role-Based Access Control (`SuperAdmin`, `Lead`) and bcryptjs password hashing
- **Media Ingestion**: ImageKit.io CDN integration with fallback to local disk storage (`server/uploads/`)
- **Reporting**: PDFKit automated document generation (`Asterix_Workshop_2026_Official_Report.pdf`)
- **Alerts**: WhatsApp Business Cloud API automated event dispatches (`whatsapp.js`)
- **Protection**: Rate limiting middleware (`rateLimit.js`), roll-number deletion confirmations, and soft-delete recycle bin (`recycleBin.js`)

---

## Quick Start

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Configure variables in .env (MONGODB_URI, JWT_SECRET, etc.)

# 3. Install dependencies
npm install

# 4. Start development server with file watch
npm run dev

# 5. Run automated test suite
npm test  # From the project root
```

---

## Core Route Handlers (`src/routes/`)

| Route | Primary Responsibilities |
|---|---|
| `/api/auth` | Administrator and lead login, session validation (`/me`), account management |
| `/api/site-data` | Dynamic site content sections (Hero, Story, Subsystems, Gallery, Updates) |
| `/api/workshop` | Workshop registrations, payment verification, and participant roster |
| `/api/attendance` | Session window enforcement, dynamic QR check-ins, joint combo QR, and SSE live feed |
| `/api/quiz` | Live exam runner, answer validation, re-quiz permissions, and leaderboard data |
| `/api/blog` | Community blog articles, author management, markdown rendering, and post drafts |
| `/api/blog-engagement` | Reader comments, claps/reactions, interactive polls, and reading analytics |
| `/api/upload` | Multipart media uploads to ImageKit CDN / local server storage |
| `/api/subscribers` | Alliance newsletter subscriptions with tokenized unsubscribe handling |
| `/api/sponsor-inquiries` | Corporate sponsorship proposals and inquiry status management |

---

## Maintenance & Utility Scripts (`src/scripts/`)

- `verifyRegistrations.js` — Audits registration data integrity, detects receipt gaps, and checks missing fields.
- `backupRegistrations.js` — Exports a point-in-time JSON/CSV snapshot of all workshop registrations.
- `generateOfficialWorkshopReport.js` — Compiles official PDF workshop reports with session statistics.
- `seedWorkshopSessions.js` — Seeds multi-track workshop session definitions.
- `generateMakeupTasks.js` — Generates attendance recovery briefs for participants with missed sessions.
- `restoreDeleted.js` — Restores records from the soft-delete recycle bin.
- `reconcileRazorpay.js` — Reconciles workshop database records with payment gateway logs.
