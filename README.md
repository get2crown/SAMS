# AttendanceOS

A multi-tenant attendance management system with geofenced GPS check-in and
facial recognition, built for companies who need reliable "were they
actually there" attendance tracking without buying hardware.

## What it does

- **Geofenced check-in** — verifies the employee is within the company's
  configured radius of the office before accepting a check-in
- **Facial recognition with liveness detection** — a calibrated blink check
  (not a fixed threshold) confirms a live person, not a photo, before a
  128-d face descriptor is captured and matched server-side
- **Multi-tenant RBAC** — `employee` → `manager` (HR/HOD) → `admin` (runs
  one company) → `super_admin` (platform-wide, sees/edits every company)
- **Per-company configuration** — geofence radius, late-arrival cutoff, and
  display name are all admin-configurable, not hardcoded
- **Employee management with real accounts** — admins create employees with
  real login credentials (not a disconnected mock), assign roles, and reset
  passwords
- **Attendance history & analytics** — company-wide stats, per-employee
  breakdowns, a daily check-ins trend chart, and CSV payroll export, all on
  the Reports page
- **Address-based office location** — search an address (OpenStreetMap
  Nominatim, no API key needed), drop/drag a pin on an embedded Leaflet map,
  or use current GPS location — used both when creating a company and when
  updating an existing one's location (e.g. after a move or a new branch)

## Tech stack

**Frontend**: React 18 + TypeScript, Vite, Tailwind CSS, Zustand,
`@vladmandic/face-api` (maintained TensorFlow.js face-api fork — the
original `face-api.js` is unmaintained and breaks under modern bundlers)

**Backend**: Node.js + Express + TypeScript, PostgreSQL, JWT auth, bcrypt

**Maps**: Leaflet + OpenStreetMap tiles, forward geocoding via Nominatim —
no Google Maps API key, no billing account, no signup required

## Quick start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+ running locally
- A webcam + location services for the actual check-in flow

### 1. Install dependencies

```bash
npm run install-all
```

### 2. Set up the database

```bash
createdb attendance_db
psql -d attendance_db -f backend/migrations/001_create_tables.sql
psql -d attendance_db -f backend/migrations/002_add_face_descriptor.sql
psql -d attendance_db -f backend/migrations/003_add_employee_fields.sql
psql -d attendance_db -f backend/migrations/004_add_company_settings.sql
```

### 3. Configure environment variables

`backend/.env` (copy `backend/.env.example` and fill in):
```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=attendance_db
DB_USER=postgres
DB_PASSWORD=<your postgres password>
JWT_SECRET=<random string>
JWT_REFRESH_SECRET=<a different random string>
```

`frontend/.env`:
```
VITE_API_URL=http://localhost:5000/api
```

### 4. Run it

**Option A — one command, waits for each service to be ready:**
```bash
npm run start:silent   # Windows/PowerShell
```
Prints the app URL once both servers are confirmed up. Stop with:
```bash
npm run stop:silent
```

**Option B — both servers in one terminal, interleaved logs:**
```bash
npm run dev
```

Backend: `http://localhost:5000` · Frontend: `http://localhost:3000`

### 5. Create your first company

Go to `/register` and choose **"Create new company"** — no SQL required.
Fill in a company name, then set the office location either by typing an
address into the search box (looked up via OpenStreetMap), tapping **"Use
my current location"** while standing at the office, or dragging the pin
on the map — this becomes the geofence center — and submit. You become
that company's `admin` automatically. Teammates either register with
**"Join existing company"** using the company ID you can find in Company
Settings, or — better — you create their accounts directly from the
**Employees** page with a password you set for them.

If the company later moves, or opens another branch, an admin (or a
super_admin, for any company) can update the office location the same
way from **Company Settings** — search a new address, or drag the pin.

### 6. (Optional) Promote yourself to platform super_admin

There's no self-serve way to do this — nothing should be able to grant
platform-wide access over HTTP without an existing super_admin approving
it. It's a direct database operation instead:

```bash
cd backend
npm run promote-super-admin -- you@yourcompany.com
```

This gives that account a **Platform Admin** panel to view and edit every
company and every user on the instance, in addition to their normal access
to their own company.

## How the attendance flow actually works

1. **Enroll once**: camera captures 3 face samples ~200ms apart and
   averages them into one reference descriptor — smooths out single-frame
   lighting/angle noise, since this becomes what every future check-in is
   compared against.
2. **Check-in**: camera and liveness detection start immediately; GPS
   location is fetched in parallel in the background rather than blocking
   the camera. A blink is detected via Eye-Aspect-Ratio calibrated to
   *your* face at the start of each session (not a fixed threshold, which
   doesn't generalize across faces/cameras/lighting). If no blink is caught
   within ~7s, a manual "tap to continue" fallback appears.
3. **Server-side verification**: the backend independently recomputes the
   face match (never trusts a client-supplied score) at a minimum 20%
   confidence, and checks the reported GPS accuracy against the company's
   configured geofence radius — a device can't be more precise about
   "inside the fence" than the fence itself, so accuracy tolerance scales
   with the radius rather than a fixed meter value.
4. **Buddy sign-in prevention**: a session cache blocks a second check-in
   from the same account until checked out.

## Roles

| Role | Scope |
|---|---|
| `employee` | Check in/out, view own history |
| `manager` | + create/edit employees, view company analytics (this is your HR/HOD tier) |
| `admin` | + change roles, edit company settings (geofence, late cutoff, name) |
| `super_admin` | + every company on the platform — view, edit settings, manage users, change roles |

## Project structure

```
SAMs/
├── backend/
│   ├── migrations/          # Run in order: 001 → 004
│   ├── scripts/
│   │   └── promote-super-admin.ts
│   └── src/
│       ├── config/          # DB connection
│       ├── controllers/     # auth, attendance, biometric, employee, company, admin, analytics
│       ├── middleware/       # JWT auth + role-based access control
│       ├── routes/
│       └── services/        # business logic, incl. geofence/liveness/match rules
├── frontend/
│   ├── public/models/       # face-api.js model weights (bundled from @vladmandic/face-api)
│   └── src/
│       ├── components/      # CameraCheckIn, LocationPicker (Leaflet map), layout shell (Sidebar/Topbar)
│       ├── pages/           # Dashboard, Attendance, History, Employees, Reports, SuperAdmin
│       ├── services/        # API clients (incl. geocodeService, analyticsService)
│       └── stores/          # auth state (zustand)
├── start.ps1 / stop.ps1     # launch/stop both servers, silently, with readiness checks
└── package.json             # root scripts: dev, build, install-all, start:silent, stop:silent
```

## API overview

All routes are prefixed `/api`. Auth via `Authorization: Bearer <token>`.

| Route | Access | Purpose |
|---|---|---|
| `POST /auth/register` | public | create company+admin, or join existing company |
| `POST /auth/login` | public | |
| `GET /auth/me` | any | current user + `faceEnrolled` status |
| `POST /biometric/enroll` | any | store averaged face descriptor |
| `POST /attendance/check-in` / `check-out` | any | geofence + liveness-verified attendance |
| `GET /attendance/history` | any | own history |
| `GET /employees` / `POST` / `PUT /:id` / `DELETE /:id` | manager, admin | manage employees in own company |
| `GET /companies/me` / `PUT` | any / admin | view / edit own company settings |
| `GET /analytics/*` | manager, admin | company stats, daily trends, payroll CSV |
| `GET /admin/companies` / `PUT /:id` / `GET /:id/users` / `PUT /users/:id` | super_admin only | cross-company oversight |
| `GET /geocode?address=` | public, rate-limited | address → coordinates (Nominatim proxy) |

## Known limitations / not yet built

- No email notifications, no mobile app, no offline mode
- Nominatim (the free geocoding service) is rate-limited to ~1 request/sec
  and works best with fairly complete addresses — a bare city or landmark
  name sometimes resolves to the wrong country. The map picker's
  drag-to-adjust and click-to-place are there specifically to correct that.
