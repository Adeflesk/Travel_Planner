# Travel Planner

A full-stack travel planning application built with FastAPI and Next.js. Organise trips day-by-day, track transport, manage expenses, and pack smarter.

## Features

### Trip Management
- **5-step Trip Wizard** — create a trip with name, dates, trip type, pacing, and budget in one guided flow
- **TripContext** — trip-level preferences (trip type, vehicle, flight type, accommodation, pacing, currency) stored as a JSON column; drives smart defaults throughout the app
- **Trip Settings** — edit TripContext at any time from the trip header
- **Trip Sharing** — share trips with other users with view or edit permissions
- **Dashboard** — overview of upcoming and recent trips with key stats

### Day Builder
- **Trip Days** — create one day per date for a trip; each day has a title, location, and notes
- **Day Timeline** — vertical chronological view of a day's activities and transport
- **Day Map** — interactive Leaflet map (OpenStreetMap) alongside the timeline; numbered activity markers, destination pin, route polyline, and transport overlays; sticky on desktop, collapsible on mobile
- **Destination-Day Linking** — link each day to a trip destination via `DestinationPicker`; inline destination creation supported; clicking an activity in the timeline highlights its pin on the map
- **Activities** — add timed activities (start + optional end time) to a day, with category, location, cost, booked status, and optional lat/lng for map placement
- **Transport on Day Pages** — transport items appear in the day timeline alongside activities; overnight legs appear on both departure and arrival days

### Transport
- **TripTransport model** — a simple, day-anchored transport record covering flight, train, bus, drive, ferry, and other types
- **Adaptive form** — `TransportForm` is config-driven via `TRANSPORT_CONFIG`; field labels, placeholders, and visibility adapt per transport type (e.g. "Airline" / "Flight number" for flights, distance + tolls for drives)
- **Overnight toggle** — opt-in overnight flag with auto-detect nudge when arrival time precedes departure time
- **Transport options** — compare alternatives (e.g. bus vs train) on a single leg before committing

### Expenses & Budget
- **Expense tracking** — log costs by category with payment status, currency, and booking reference
- **Budget alerts** — configurable warning and danger thresholds on the trip budget
- **Multi-currency** — each expense stores its own currency; trip budget is denominated in the trip's `budget_currency`

### Other Features
- **Destinations** — attach destination records to a trip with arrival/departure dates and timezone
- **Activities (destination-level)** — schedule activities at a destination with booking info and status
- **Packing Lists** — organise items by category with packed status
- **AI Suggestions** — get activity and destination suggestions powered by pattern matching
- **User Settings** — default currency, home base, and feature flags
- **Weather Integration** — weather info for trip destinations
- **Help Center** — searchable in-app documentation

---

## Tech Stack

### Backend
- **Python 3.13** with **FastAPI**
- **SQLAlchemy** ORM with SQLite (local dev) / PostgreSQL (production)
- **Pydantic v2** for request/response validation
- **JWT** authentication (access + refresh tokens)
- **SlowAPI** for rate limiting
- Auto-run migrations on startup via `app/core/migrations.py`

### Frontend
- **Next.js 16** (App Router) with **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **react-hook-form** + **zod** for form validation
- **date-fns** / **date-fns-tz** for datetime arithmetic
- **Lucide React** icons
- **Leaflet** + **react-leaflet** for interactive maps
- **Axios** for API calls
- **Vitest** + **Testing Library** for unit tests
- **Playwright** for end-to-end tests

### Deployment
- **Backend** — [Fly.io](https://fly.io) (`fly.toml`)
- **Frontend** — [Vercel](https://vercel.com) (`vercel.json`)
- **Database** — PostgreSQL via [Neon](https://neon.tech) in production; SQLite locally

---

## Project Structure

```
Travel_Planner/
├── app/                          # FastAPI backend
│   ├── core/                     # Security, deps, rate limiting, migrations
│   ├── models/                   # SQLAlchemy models
│   │   ├── trip.py               # Trip (+ context JSON column)
│   │   ├── trip_day.py           # TripDay (one per calendar date)
│   │   ├── day_activity.py       # DayActivity (unified activity model; lat/lng for map)
│   │   ├── trip_transport.py     # TripTransport (flight/train/drive/etc.)
│   │   ├── transport_option.py   # TransportOption (compare alternatives)
│   │   ├── destination.py        # Destination
│   │   ├── expense.py            # Expense
│   │   ├── packing_item.py       # PackingItem
│   │   ├── user.py               # User
│   │   ├── user_settings.py      # UserSettings
│   │   └── trip_share.py         # TripShare
│   ├── routers/                  # API endpoints (one file per resource)
│   ├── schemas/                  # Pydantic request/response schemas
│   ├── services/                 # Business logic
│   └── main.py                   # App factory, router registration
├── frontend/                     # Next.js frontend
│   ├── app/                      # Pages (App Router)
│   │   ├── trips/[id]/           # Trip detail page
│   │   │   └── days/[dayId]/     # Day Builder page
│   │   ├── dashboard/            # Dashboard
│   │   ├── settings/             # User settings
│   │   └── help/                 # Help center
│   ├── components/
│   │   ├── days/                 # DayBuilder, DayTimeline, ActivityForm, DestinationPicker, TransportBlock
│   │   ├── map/                  # DayMap (Leaflet, SSR-disabled)
│   │   ├── transport/            # TransportForm, TransportItem, TransportOptionList
│   │   ├── trips/                # TripWizard, TripSettings, TripSidebar, TripCard
│   │   ├── dashboard/            # Dashboard components
│   │   ├── expenses/             # Expense list and forms
│   │   ├── packing/              # Packing list components
│   │   ├── destinations/         # Destination components
│   │   └── ui/                   # Shared UI primitives
│   ├── lib/
│   │   ├── api.ts                # Typed API client (Axios)
│   │   ├── types.ts              # TypeScript interfaces
│   │   ├── transport-config.ts   # TRANSPORT_CONFIG (adaptive form driver)
│   │   ├── useGeocode.ts         # Rate-limited Nominatim geocoding hook
│   │   ├── geocode-utils.ts      # geocodeAddress helper
│   │   └── datetime-utils.ts     # Date helpers (date-fns wrappers)
│   └── e2e/                      # Playwright end-to-end tests
├── migrations/                   # One-shot SQL migration scripts
├── tests/                        # Backend pytest tests
└── docs/
    ├── features/                 # Feature specifications
    └── plans/                    # Architecture and design docs
```

---

## Getting Started

### Prerequisites

- Python 3.13+
- Node.js 18+
- npm

### Backend Setup

```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate   # macOS/Linux
# .venv\Scripts\activate    # Windows

# Install dependencies
pip install -r requirements.txt

# Start the dev server
uvicorn app.main:app --reload
```

API available at **http://localhost:8000**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

App available at **http://localhost:3000**

---

## API Endpoints

| Resource | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh` |
| Trips | `GET/POST /trips`, `GET/PUT/DELETE /trips/{id}` |
| Trip Days | `GET/POST /trips/{id}/days`, `GET/PUT/DELETE /days/{id}` |
| Day Activities | `GET/POST /days/{id}/activities`, `PUT/DELETE /day-activities/{id}` |
| Transport | `GET/POST /trips/{id}/transports`, `GET/PUT/DELETE /trip-transports/{id}` |
| Transport Options | `GET/POST /trip-transports/{id}/options`, `PUT/DELETE /transport-options/{id}` |
| Destinations | `GET/POST /trips/{id}/destinations`, `PUT/DELETE /destinations/{id}` |
| Activities | `GET/POST /destinations/{id}/activities`, `PUT/DELETE /activities/{id}` |
| Expenses | `GET/POST /trips/{id}/expenses`, `PUT/DELETE /expenses/{id}` |
| Packing | `GET/POST /trips/{id}/packing`, `PUT/DELETE /packing/{id}` |
| Settings | `GET/PUT /settings` |
| Dashboard | `GET /dashboard` |
| Suggestions | `GET /suggestions` |
| Admin | `GET /admin/users`, `PUT/DELETE /admin/users/{id}` |

---

## Running Tests

### Backend (pytest)
```bash
source .venv/bin/activate
pytest tests/ -v
```

### Frontend Unit Tests (Vitest)
```bash
cd frontend
npm run test:unit
```

### Frontend E2E Tests (Playwright)
```bash
cd frontend
npx playwright test
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database
DATABASE_URL=sqlite:///./travel_planner.db   # local
# DATABASE_URL=postgresql://user:pass@host/db  # production (Neon)

# CORS
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Environment
ENVIRONMENT=development   # set to 'production' to hide API docs
```

---

## Database

- **Local dev:** SQLite (`travel_planner.db`, created automatically on first run)
- **Production:** PostgreSQL via Neon

Schema changes are applied via scripts in `migrations/`. On startup, `app/core/migrations.py` runs any pending migrations automatically so the app works against both fresh and existing databases without manual steps.

---

## Architecture Notes

- **TripContext** — a `context` JSON column on the `trips` table stores the answers from the Trip Wizard (trip type, vehicle, flight type, pacing, budget currency). Downstream components read from a `TripContextProvider`; no prop drilling.
- **Day-first transport** — transport is anchored to `TripDay` records (one per calendar date). A `TripTransport` record has a `departure_day_id` and optionally an `arrival_day_id` for overnight legs. Cross-day trips appear on both day timelines.
- **TRANSPORT_CONFIG** — a single TypeScript object at `frontend/lib/transport-config.ts` drives all field visibility, labels, and placeholders in `TransportForm`. No per-type conditional logic scattered through JSX.
- **TransportOption** — each `TripTransport` can have child `TransportOption` records for comparing alternatives before committing to one.
- **Day Map** — `DayMap` is dynamically imported with `ssr: false` (Leaflet requires `window`). It uses CSS `isolation: isolate` to keep Leaflet's high z-indices from bleeding above modals. Activity markers are auto-geocoded via a rate-limited Nominatim queue in `useGeocode.ts`.
- **Destination-Day Linking** — `DestinationPicker` patches `trip_days.destination_id` on the backend; the map uses this to place the destination pin and generate the route polyline. Transport form uses the linked destination to auto-fill the origin field.

---

## License

Personal use.
