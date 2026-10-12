# Team Asterix Website — Backend Architecture & Technical Guide

This document provides a comprehensive, deep-dive explanation of the backend architecture, data model, API endpoints, authentication system, and integration patterns powering the **Team Asterix BAJA SAEINDIA** portal.

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack & Prerequisites](#2-technology-stack--prerequisites)
3. [Directory & File Structure](#3-directory--file-structure)
4. [Database Engine & Schema Design](#4-database-engine--schema-design)
5. [Database Initialization & Auto-Seeding](#5-database-initialization--auto-seeding)
6. [Authentication & Authorization (RBAC)](#6-authentication--authorization-rbac)
7. [REST API Specification](#7-rest-api-specification)
   - [7.1 Health Check](#71-health-check)
   - [7.2 Site Data Management](#72-site-data-management)
   - [7.3 Authentication & User Accounts](#73-authentication--user-accounts)
   - [7.4 Subscribers (Alliance)](#74-subscribers-alliance)
   - [7.5 Media & Asset Uploads](#75-media--asset-uploads)
8. [Media Storage & Static Assets Pipeline](#8-media-storage--static-assets-pipeline)
9. [Frontend-to-Backend Integration & Offline Resilience](#9-frontend-to-backend-integration--offline-resilience)
10. [Development Workflows & Environment Configuration](#10-development-workflows--environment-configuration)
11. [Production Deployment & Infrastructure Guide](#11-production-deployment--infrastructure-guide)

---

## 1. Architecture Overview

The backend is built as a lightweight, high-performance Node.js service using **Express.js** and **MongoDB Atlas** (via **Mongoose**). It serves REST API endpoints for dynamic content management, administrator authentication, member account provisioning, public fan subscriptions, corporate sponsorship inquiries, and media uploads.

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT LAYER                                      |
|                                                                                   |
|   React 19 + Vite SPA (Port 5173)                                                |
|   - WebsiteDataContext (Content cache, debounced sync, offline fallback)         |
|   - Admin Dashboard (`#admin`)                                                    |
|   - Sponsor Page (`#sponsor` corporate partnership inquiries)                     |
|   - CyberNewsletterCTA ("Join the Alliance" subscriber form)                      |
+-------------------------+---------------------------------------------------------+
                          |
                          | (Proxy via Vite: `/api` & `/uploads` -> `:5000`)
                          v
+-----------------------------------------------------------------------------------+
|                             EXPRESS BACKEND LAYER                                 |
|                                                                                   |
|   Express 4 Server (`server/src/index.js`, Port 5000)                             |
|   +---------------------------------------------------------------------------+   |
|   | Middleware: CORS, JSON (50MB limit), Static `/uploads`, Error Handler     |   |
|   +---------------------------------------------------------------------------+   |
|   | Security: JWT Verification, Role-Based Access Control (SuperAdmin / Lead)  |   |
|   +---------------------------------------------------------------------------+   |
|   | Routes:                                                                   |   |
|   |   - `/api/health`            -> Service health status                     |   |
|   |   - `/api/site-data`         -> Dynamic section JSON content (GET/PUT)    |   |
|   |   - `/api/auth`              -> Login, profile session, account CRUD      |   |
|   |   - `/api/subscribers`       -> Newsletter subscription capture           |   |
|   |   - `/api/sponsor-inquiries` -> Corporate partner proposal inquiries     |   |
|   |   - `/api/upload`            -> Multer multipart image processing         |   |
|   +---------------------------------------------------------------------------+   |
+-------------------------+-----------------------------------+---------------------+
                          |                                   |
                          v                                   v
+------------------------------------+  +-------------------------------------------+
|          DATABASE LAYER            |  |             PERSISTENT STORAGE            |
|                                    |  |                                           |
|  MongoDB Atlas (Cloud Cluster)     |  |  `server/uploads/`                        |
|  - Mongoose 9 Models               |  |  - High-res images, paddock photos        |
|  - Collections:                    |  |  - Max 15MB/file, MIME filtered           |
|    * `sitedatas` (Single Doc Key)  |  |  - Served publicly via `/uploads/:file`   |
|    * `users`                       |  +-------------------------------------------+
|    * `subscribers`                 |
|    * `sponsorinquiries`            |
+------------------------------------+
```

---

## 2. Technology Stack & Prerequisites

| Component | Technology | Version | Purpose |
|---|---|---|---|
| **Runtime Environment** | Node.js | `>= 22.5.0` (Recommended: `24.x`) | Built-in synchronous SQLite without native C++ compilation steps |
| **HTTP Framework** | Express.js | `^4.19.2` | Route orchestration, middleware pipeline, static serving |
| **Database Engine** | `node:sqlite` (`DatabaseSync`) | Built-in | Embedded, file-based relational database with zero binary external dependencies |
| **Password Hashing** | `bcryptjs` | `^2.4.3` | One-way password hashing with salt rounds = 10 |
| **Authentication** | `jsonwebtoken` | `^9.0.2` | Signed bearer tokens for authenticated API calls (7-day validity) |
| **File Uploads** | `multer` | `^1.4.5-lts.1` | Multipart form-data handling with disk storage and mime validation |
| **Cross-Origin Handling** | `cors` | `^2.8.5` | Configured for `http://localhost:5173` with credentials support |
| **Environment Config** | `dotenv` | `^16.4.5` | Loads environment variables from `server/.env` |

> [!IMPORTANT]
> **Node.js 24 Requirement**: The backend utilizes the native `DatabaseSync` class from Node's built-in `node:sqlite` module. While introduced in Node 22.5 under experimental flags, Node 24 offers stable out-of-the-box support without needing `better-sqlite3` or external `node-gyp` builds.

---

## 3. Directory & File Structure

The backend source code is entirely contained within the `/server` directory:

```
server/
├── .env                  # Local secret configuration (port, JWT secret, CORS origin)
├── .env.example          # Sample environment template
├── package.json          # Server dependencies and start scripts
├── package-lock.json     # Dependency lockfile
├── data/
│   ├── .gitkeep
│   ├── asterix.db        # SQLite database file
│   ├── asterix.db-shm    # SQLite shared memory file (WAL mode)
│   └── asterix.db-wal    # SQLite write-ahead log file
├── uploads/              # Persisted uploaded gallery & vehicle images
└── src/
    ├── index.js          # Main Express server entry point
    ├── config/           # Reserved for runtime config
    ├── db/
    │   └── database.js   # Database initialization, schema creation, auto-seed data
    ├── middleware/
    │   ├── auth.js       # JWT validation & role verification middleware
    │   └── upload.js     # Multer file size & mime validation middleware
    └── routes/
        ├── auth.js        # /api/auth routes (login, me, accounts)
        ├── siteData.js    # /api/site-data routes (content CRUD)
        ├── subscribers.js # /api/subscribers routes (newsletter capture)
        └── upload.js      # /api/upload routes (image ingestion)
```

---

## 4. Database Engine & Schema Design

The backend connects to a **MongoDB Atlas Cloud Database Cluster** using **Mongoose 9**:
* Auto-reconnecting connection pool with TLS certificate resilience.
* Automatic data migration utility from legacy SQLite `asterix.db` databases (`npm run migrate:mongo`).

### Database Connection (`server/src/db/mongodb.js`)
```javascript
import mongoose from 'mongoose';
await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 8000,
});
```

### Model 1: `SiteData` (`sitedatas` Collection)
Stores all dynamic sections of the website in a single structured document (`{ key: 'main' }`):
* `hero`: Headlines, badges, CTA button link, Google Forms application link.
* `story`: Full team heritage and endurance development journey markdown/text.
* `subsystems`: Array of 5 engineering domains (Software, Sensors, Powertrain, Steer-by-Wire, Brake & Throttle) with specs, subsystem leads, and roster members.
* `gallery`: Paddock and track action photos with title, category, year, and description.
* `updates`: Team bulletins, race logs, and milestone articles.
* `contact`: Email, address, social media URLs (Instagram, LinkedIn, GitHub).
* `sponsorship`: Downloadable pitch deck PDF links, brochures, and institution endorsement letter links.
* `recruitment`: Static content for the `#join` portal — shared intro copy plus three per-subsystem tracks (Software & Perception, Powertrain, Mechanical), each carrying its own timeline (dated milestones), its own problem statement(s), and its own Google Form link. Applications themselves are taken through the Google Forms, not this API. See [working.md](./working.md).
* `lastModified`: ISO-8601 timestamp tracking when content was last updated.

### Model 2: `User` (`users` Collection)
Maintains user credentials and access privileges for team leads and administrators.
* `username`: Unique username (stored lowercase, case-insensitive match on login).
* `passwordHash`: Salting and hashing via `bcryptjs` (salt rounds: 10).
* `name`: Full display name (e.g., `"Ratheeswar"`).
* `role`: Official team designation (e.g., `"System Administrator & Software Lead"`).
* `accessLevel`: RBAC permissions enum:
  - `'SuperAdmin'`: Full read/write access + account provisioning/deletion.
  - `'Lead'`: Content read/write access + self-profile updates.

### Model 3: `Subscriber` (`subscribers` Collection)
Collects contact details from the "Join the Asterix Racing Alliance" public CTA.
* `email`: Normalized lowercase unique subscriber email.
* `phone`: Optional phone number string.
* `createdAt` / `updatedAt`: Automatic Mongoose timestamps.

### Model 4: `SponsorInquiry` (`sponsorinquiries` Collection)
Collects corporate partnership proposals submitted via the `#sponsor` modal:
* `companyName`: Name of sponsoring enterprise.
* `contactPerson`: Representative name.
* `email`: Corporate email.
* `phone`: Contact phone number.
* `tier`: Desired sponsorship package (`TITLE`, `GOLD`, `SILVER`, `BRONZE`, `TECHNICAL`).
* `message`: Proposed collaboration details.
* `status`: Lead workflow status (`NEW`, `REVIEWED`, `CONTACTED`, `ARCHIVED`).

---

## 5. Database Initialization & Auto-Seeding

On server startup, `initDatabase()` executes in `server/src/db/database.js`:

1. **Schema Check**: Validates and creates missing tables (`site_data`, `users`, `subscribers`).
2. **Initial Content Seeding**:
   - If `COUNT(*) FROM site_data === 0`, it inserts default production-grade data for:
     - **`hero`**: Team name, title, tagline, competition badges (`AIR 13`, `SAEINDIA a-BAJA 2026`, `TN RANK 1`), and Google Form join URL.
     - **`story`**: Full 14-paragraph narrative tracing Team Asterix's origin from a college training program to an a-BAJA racing outfit.
     - **`subsystems`**: All 5 comprehensive engineering subsystems:
       1. *Software and Perception* (ROS 2 Jazzy, C++ OpenCV, Stanley Lateral Controller, 1D Kalman tracking, safety watchdog).
       2. *Powertrain* (Custom ratio reduction gearbox, 380 Nm wheel torque, continuous variable transmission dynamics).
       3. *Drive By Wire* (High-torque brushless steer-by-wire servo, <8ms latency, redundant CAN-FD).
       4. *Brake & Throttle by Wire* (Proportional hydraulic brake actuation, hall-effect throttle mapping, fail-safe disconnect).
       5. *Sensors & Telemetry* (Solid-state LiDAR, dual 1080p vision, 9-DOF IMU, real-time pitlane radio telemetry).
     - **`gallery`**: 6 default technical gallery items with categories, technical descriptions, and metadata.
     - **`updates`**: Competition and development timeline milestones.
     - **`contact`**: Team email, PSG iTech campus address, and official social media URLs (Instagram, LinkedIn, GitHub).
3. **Initial Administrator Account Seeding**:
   - If `COUNT(*) FROM users === 0`, creates 3 seed accounts:

| Username | Default Password | Name | Role | Access Level |
|---|---|---|---|---|
| `admin` | `asterix2026` | Ratheeswar | System Administrator & Software Lead | `SuperAdmin` |
| `powertrain_lead` | `baja2026powertrain` | Powertrain Lead | Subsystem Lead | `Lead` |
| `chassis_lead` | `baja2026chassis` | Chassis Lead | Subsystem Lead | `Lead` |

---

## 6. Authentication & Authorization (RBAC)

Authentication is implemented via stateless **JSON Web Tokens (JWT)**:

### 1. Login Flow (`POST /api/auth/login`)
1. User provides `username` and `password`.
2. Database query searches for `LOWER(username) = LOWER(?)`.
3. Password verification matches against `bcrypt.compareSync(password, user.password_hash)`.
4. If verified, the server constructs a signed JWT payload:
   ```json
   {
     "id": "acc-1",
     "username": "admin",
     "name": "Ratheeswar",
     "role": "System Administrator & Software Lead",
     "accessLevel": "SuperAdmin"
   }
   ```
5. Returns token with **7 days expiration** (`{ expiresIn: '7d' }`).

### 2. Authorization Middleware (`server/src/middleware/auth.js`)
- **`authenticateToken(req, res, next)`**:
  - Reads `Authorization: Bearer <token>` header.
  - Verifies signature against `process.env.JWT_SECRET`.
  - Sets `req.user = decodedToken`.
  - Responds with `401 Unauthorized` if token is missing, or `403 Forbidden` if invalid or expired.
- **`requireSuperAdmin(req, res, next)`**:
  - Checks if `req.user.accessLevel === 'SuperAdmin'`.
  - Returns `403 Forbidden` if the user is a standard `Lead`.

### 3. Role-Based Permissions Matrix

| Resource / Action | Public | Lead | SuperAdmin |
|---|:---:|:---:|:---:|
| Read Site Content (`GET /api/site-data`) | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Join Alliance / Subscribe (`POST /api/subscribers`) | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| View Uploaded Images (`GET /uploads/*`) | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Update Site Content (`PUT /api/site-data`) | :x: | :white_check_mark: | :white_check_mark: |
| Upload Media (`POST /api/upload`) | :x: | :white_check_mark: | :white_check_mark: |
| View Subscriber List (`GET /api/subscribers`) | :x: | :white_check_mark: | :white_check_mark: |
| Delete Subscriber (`DELETE /api/subscribers/:id`) | :x: | :white_check_mark: | :white_check_mark: |
| View Team Accounts (`GET /api/auth/accounts`) | :x: | :white_check_mark: | :white_check_mark: |
| Edit Own Profile / Password | :x: | :white_check_mark: | :white_check_mark: |
| Create New Team Accounts (`POST /api/auth/accounts`) | :x: | :x: | :white_check_mark: |
| Edit Other Accounts / Elevate Roles | :x: | :x: | :white_check_mark: |
| Delete Accounts (`DELETE /api/auth/accounts/:id`) | :x: | :x: | :white_check_mark: |

---

## 7. REST API Specification

### 7.1 Health Check
#### `GET /api/health`
- **Access**: Public
- **Description**: Returns online heartbeat and server timestamp.
- **Response**: `200 OK`
```json
{
  "status": "online",
  "service": "Team Asterix API & Database Engine",
  "timestamp": "2026-08-29T17:35:00.000Z"
}
```

---

### 7.2 Site Data Management

#### `GET /api/site-data`
- **Access**: Public
- **Description**: Fetches all website content sections in one request.
- **Response**: `200 OK`
```json
{
  "hero": { ... },
  "story": "...",
  "subsystems": [ ... ],
  "gallery": [ ... ],
  "updates": [ ... ],
  "contact": { ... },
  "lastModified": "2026-08-29T17:00:00.000Z"
}
```

#### `PUT /api/site-data`
- **Access**: Protected (`authenticateToken`)
- **Headers**: `Authorization: Bearer <jwt>`
- **Request Body**: Partial or full JSON object containing sections to update:
```json
{
  "hero": { ... },
  "story": "Updated narrative...",
  "subsystems": [ ... ],
  "gallery": [ ... ]
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Website data saved successfully to database",
  "lastModified": "2026-08-29T17:36:12.000Z"
}
```

---

### 7.3 Authentication & User Accounts

#### `POST /api/auth/login`
- **Access**: Public
- **Request Body**:
```json
{
  "username": "admin",
  "password": "asterix2026"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "acc-1",
    "username": "admin",
    "name": "Ratheeswar",
    "role": "System Administrator & Software Lead",
    "accessLevel": "SuperAdmin"
  }
}
```

#### `GET /api/auth/me`
- **Access**: Protected (`authenticateToken`)
- **Headers**: `Authorization: Bearer <jwt>`
- **Description**: Validates session and returns current profile.
- **Response**: `200 OK`

#### `GET /api/auth/accounts`
- **Access**: Protected (`authenticateToken`)
- **Description**: Returns all registered admin and lead accounts.

#### `POST /api/auth/accounts`
- **Access**: Protected (`requireSuperAdmin`)
- **Request Body**:
```json
{
  "username": "sensor_lead",
  "password": "securepassword123",
  "name": "Sensor Subsystem Lead",
  "role": "Perception & LiDAR Lead",
  "accessLevel": "Lead"
}
```
- **Response**: `201 Created`

#### `PUT /api/auth/accounts/:id`
- **Access**: Protected (`SuperAdmin` or self)
- **Description**: Updates profile details or password. Non-SuperAdmins can only change their own profile name and password; cannot alter roles or permissions.

#### `DELETE /api/auth/accounts/:id`
- **Access**: Protected (`requireSuperAdmin`)
- **Description**: Deletes an account. Users cannot delete their own active account.

---

### 7.4 Subscribers (Alliance)

#### `POST /api/subscribers`
- **Access**: Public
- **Description**: Submits contact details for team updates and news.
- **Request Body**:
```json
{
  "email": "sponsor@example.com",
  "phone": "+91 9876543210"
}
```
- **Logic**: Performs an `INSERT ... ON CONFLICT(email) DO UPDATE SET phone = COALESCE(excluded.phone, subscribers.phone)`.
- **Response**: `201 Created`

#### `GET /api/subscribers`
- **Access**: Protected (`authenticateToken`)
- **Description**: Returns list of all subscribers sorted by `created_at DESC`.

#### `DELETE /api/subscribers/:id`
- **Access**: Protected (`authenticateToken`)
- **Description**: Removes subscriber by ID.

---

### 7.5 Media & Asset Uploads

#### `POST /api/upload`
- **Access**: Protected (`authenticateToken`)
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `image` (binary file)
  - `folder` (optional, e.g. `/asterix/gallery`, `/asterix/squad`, `/asterix/updates`)
  - `tags` (optional comma-separated tags)
- **Validation**: Up to 15MB. Permitted types: JPEG, JPG, PNG, WEBP, SVG, GIF.
- **Response (ImageKit)**: `201 Created`
```json
{
  "success": true,
  "provider": "imagekit",
  "url": "https://ik.imagekit.io/teamasterix/asterix/gallery/paddock-action.jpg",
  "thumbnailUrl": "https://ik.imagekit.io/teamasterix/asterix/gallery/tr:n-media_library_thumbnail/paddock-action.jpg",
  "fileId": "65e0123...",
  "filename": "paddock-action.jpg",
  "size": 1048576,
  "width": 1920,
  "height": 1080
}
```

#### `GET /api/upload/auth`
- **Access**: Protected (`authenticateToken`)
- **Description**: Generates client-side authentication parameters (`token`, `expire`, `signature`) for direct client uploads to ImageKit.

---

## 8. Media Storage & ImageKit CDN Pipeline

1. **Cloud CDN (Primary)**:
   - When `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, and `IMAGEKIT_URL_ENDPOINT` are set in `.env`, uploaded images are streamed directly to **ImageKit.io** media library.
   - Global CDN delivery with on-the-fly transformations (WebP/AVIF format auto-detection, responsive resizing, quality compression).
2. **Local Storage Fallback**:
   - If ImageKit is not configured, files are securely saved to `server/uploads/` and served via `/uploads/:filename`.
3. **Frontend Integration**:
   - `AdminDashboard.jsx` uploads squad members, gallery photos, and update banners through `/api/upload`, storing optimized CDN URLs in the database.

---

## 9. Frontend-to-Backend Integration & Offline Resilience

The front end communicates with the backend via `src/context/WebsiteDataContext.jsx`:

### 1. Dual-Tier Fallback Strategy
```
+----------------------------------------------------------------+
|                    Browser Loads Application                   |
+-------------------------------+--------------------------------+
                                |
                                v
                Try: GET /api/site-data from Express
                                |
        +-----------------------+-----------------------+
        |                                               |
     Success                                         Failure
        v                                               v
Update state with DB rows                     Catch network error
Set isServerConnected = true                  Set isServerConnected = false
Persist copy in localStorage                  Load from localStorage cache
                                              (or bundled code defaults)
```

- When the backend is offline (or when viewing the frontend on static hosts), the application continues to run without crashing.
- Bundled fallback assets (such as initial gallery images and subsystem descriptions) guarantee 100% visual integrity even without an active API connection.

### 2. Debounced Auto-Sync
When an administrator edits content in the `#admin` dashboard:
1. `siteData` state updates immediately in React.
2. Changes are written to browser `localStorage` synchronously.
3. A 500ms debounce timer triggers `syncToServer()`, firing `PUT /api/site-data` with the active JWT bearer token.

---

## 10. Development Workflows & Environment Configuration

### Environment Variables (`server/.env`)
Copy `server/.env.example` to `server/.env`:
```ini
PORT=5000
JWT_SECRET=asterix_super_secret_jwt_key_sae_baja_2026
CORS_ORIGIN=http://localhost:5173
```

### WhatsApp Activity Alerts
WhatsApp alerts are sent for successful workshop registrations, project submissions, attendance marks, successful admin logins (each newly issued session), and authenticated admin changes. Login failures, duplicate attendance, lookup requests, and unrelated public writes are excluded. Student alerts include the student's name; admin alerts include the admin name and changed resource, never passwords, phone numbers, or full request bodies. The `/api/health` response reports `notifications.whatsappConfigured`.

To enable delivery, configure `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ALERT_TO`, `WHATSAPP_TEMPLATE_NAME`, and `WHATSAPP_GRAPH_API_VERSION`; `WHATSAPP_TEMPLATE_LANGUAGE` defaults to `en_US`. Set the recipient in international format. Create and get approval for a WhatsApp Business Cloud API template whose body includes one placeholder, for example `Website alert: {{1}}`, matching the configured template name and language. The recipient must opt in to receive WhatsApp messages from the business. Store the access token and recipient in the backend host's environment settings, never in frontend code. Missing settings disable notifications without blocking website changes.

Delivery uses the configured approved template, including when Meta's template pricing applies. It is asynchronous and best-effort: a Meta API failure is logged by the backend and does not fail the originating website request.

### Running the Services

From the root project folder:

```bash
# 1. Install all dependencies (both root and server)
npm install
cd server && npm install && cd ..

# 2. Run both frontend (:5173) and backend (:5000) concurrently
npm run dev

# 3. Run backend with automatic reload on file changes
npm run dev:watch

# 4. Run backend only
npm run dev:backend
```

### GitHub Actions CI Verification
The repository's CI workflow (`.github/workflows/ci.yml`) runs on every push:
1. Validates syntax of all backend JS files: `node --check <file>`.
2. Tests database schema initialization on clean checkouts with Node 24:
   ```bash
   node -e "import('./src/db/database.js').then(() => console.log('schema ok'))"
   ```

---

## 11. Production Deployment & Infrastructure Guide

As documented in [CHANGES-TO-BE-MADE.md](./CHANGES-TO-BE-MADE.md), the frontend is currently deployed to Vercel at [asterix-website.vercel.app](https://asterix-website.vercel.app). 

Because SQLite (`asterix.db`) and Multer (`server/uploads/`) rely on **persistent filesystem storage**, serverless platforms (which operate on read-only or ephemeral temporary disks) will discard written data on container shutdown.

### Recommended Production Deployment Options

#### Option A: Single VPS / Docker (Recommended for simplicity)
- Deploy on a low-cost VPS (Hetzner, DigitalOcean Droplet, Linode, AWS EC2).
- Run with Node 24 + PM2 or Docker Compose.
- Mount a persistent host directory to `/server/data` and `/server/uploads`.
- Use Caddy or Nginx for automatic HTTPS / SSL termination.

#### Option B: Persistent Container (Render / Fly.io / Railway)
- **Fly.io**: Deploy using `fly launch` and attach a persistent volume:
  ```toml
  [mounts]
    source = "asterix_storage"
    destination = "/app/server/data"
  ```
- Configure environment secrets via `fly secrets set JWT_SECRET=...`.

#### Option C: Cloud Decoupling (Fully Serverless Architecture)
To make the backend completely serverless (e.g., runnable on Vercel Serverless Functions):
1. **Database**: Swap `node:sqlite` for [Turso](https://turso.tech/) (distributed LibSQL SQLite over HTTP) or Neon Serverless PostgreSQL.
2. **File Storage**: Swap disk uploads (`server/uploads/`) for AWS S3, Cloudflare R2, or Cloudinary.

---

*Document created for Team Asterix Engineering & Software Subsystem.*
