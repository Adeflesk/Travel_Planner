# Travel Planner

A full-stack travel planning application for organizing trips, destinations, journeys, activities, expenses, and packing lists.

## Features

- **Trip Management** - Create and manage trips with dates, budgets, and status tracking
- **Destinations** - Add multiple destinations per trip with arrival/departure dates
- **Journeys** - Plan transportation between destinations (flights, trains, cars, buses, ferries)
  - Route details for road trips (distance, duration, tolls)
  - Journey stops with multiple activity options
  - Document attachments (tickets, confirmations, maps)
- **Activities** - Schedule activities at each destination with booking info
- **Expenses** - Track trip costs by category with payment status
- **Packing Lists** - Organize items by category with packed status
- **Trip Sharing** - Share trips with other users (view/edit permissions)
- **Timeline View** - Visual chronological view of your trip
- **Export** - Export itinerary to PDF or text format

## Tech Stack

### Backend
- **Python 3.11+** with FastAPI
- **SQLAlchemy** ORM with SQLite database
- **Pydantic** for request/response validation
- **JWT** authentication with refresh tokens
- **SlowAPI** for rate limiting

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Lucide** icons

## Project Structure

```
Travel_Planner/
├── app/                      # FastAPI backend
│   ├── core/                 # Security, dependencies, rate limiting
│   ├── models/               # SQLAlchemy models
│   ├── routers/              # API endpoints
│   ├── schemas/              # Pydantic schemas
│   ├── services/             # Business logic
│   └── main.py               # Application entry point
├── frontend/                 # Next.js frontend
│   ├── app/                  # Pages (App Router)
│   ├── components/           # React components (organized by feature)
│   ├── lib/                  # API client, types, utilities
│   └── e2e/                  # Playwright end-to-end tests
├── tests/                    # Backend pytest tests
├── docs/                     # Documentation
│   └── features/             # Feature specifications
├── travel_planner.db         # SQLite database
└── requirements.txt          # Python dependencies
```

## Getting Started

### Prerequisites

- Python 3.11 or higher
- Node.js 18 or higher
- npm or yarn

### Backend Setup

1. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # macOS/Linux
   # or
   .venv\Scripts\activate     # Windows
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the development server:
   ```bash
   uvicorn app.main:app --reload
   ```

   The API will be available at http://localhost:8000

   - API docs: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

   The app will be available at http://localhost:3000

## API Endpoints

| Resource | Endpoints |
|----------|-----------|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh` |
| Trips | `GET/POST /trips`, `GET/PUT/DELETE /trips/{id}` |
| Destinations | `GET/POST /trips/{id}/destinations`, `PUT/DELETE /destinations/{id}` |
| Journeys | `GET/POST /trips/{id}/journeys`, `PUT/DELETE /journeys/{id}` |
| Journey Stops | `GET/POST /journeys/{id}/stops`, `PUT/DELETE /stops/{id}` |
| Journey Documents | `GET/POST /journeys/{id}/documents`, `DELETE /documents/{id}` |
| Activities | `GET/POST /destinations/{id}/activities`, `PUT/DELETE /activities/{id}` |
| Expenses | `GET/POST /trips/{id}/expenses`, `PUT/DELETE /expenses/{id}` |
| Packing | `GET/POST /trips/{id}/packing`, `PUT/DELETE /packing/{id}` |
| Admin | `GET /admin/users`, `POST/PUT/DELETE /admin/users/{id}` |

## Running Tests

### Backend Tests
```bash
source .venv/bin/activate
pytest tests/ -v
```

### Frontend E2E Tests
```bash
cd frontend
npx playwright test
```

## Environment Variables

Create a `.env` file in the root directory:

```env
# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database (optional, defaults to SQLite)
DATABASE_URL=sqlite:///./travel_planner.db

# CORS (optional)
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Environment
ENVIRONMENT=development
```

## Database

The application uses SQLite by default. The database file `travel_planner.db` is created automatically on first run.

To add new columns to existing tables:
```sql
ALTER TABLE table_name ADD COLUMN column_name TYPE;
```

## Feature Documentation

Detailed feature specifications are available in `docs/features/`. Each feature has its own markdown file with requirements, approach, and acceptance criteria.

### Completed Features
- Journey Validation
- Currency Selection
- Trip Cost Summary
- Journey Sorting
- Duplicate Journey
- Timeline Accommodations
- Schedule Conflicts
- Export Itinerary
- Trip Statistics API
- Journey Stops & Options
- Journey Documents
- Route Details

## License

This project is for personal use.
