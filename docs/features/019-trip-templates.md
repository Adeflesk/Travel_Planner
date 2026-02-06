# Feature: Trip Templates

**Status:** Planned
**Priority:** Medium
**Complexity:** Medium

## Overview

Allow users to save trips as reusable templates and create new trips from predefined or community templates. This accelerates trip planning for common itineraries and helps users learn from others' travel experiences.

## User Stories

1. As a traveler, I want to save my trip as a template so I can reuse it for future similar trips
2. As a traveler, I want to create a new trip from a template to save planning time
3. As a traveler, I want to browse popular templates for destination inspiration
4. As a traveler, I want to customize a template when creating a trip from it

## UX Design

### Save Trip as Template

```
┌─────────────────────────────────────────────────────────────────────┐
│ Summer Europe Trip 2024                               [⋮ More]     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Dropdown Menu:                                                     │
│  ┌─────────────────────────┐                                       │
│  │ ✏️  Edit Trip            │                                       │
│  │ 📋 Save as Template     │  ← New option                         │
│  │ 📤 Export Itinerary     │                                       │
│  │ 🗑️  Delete Trip          │                                       │
│  └─────────────────────────┘                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Save as Template Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│ Save Trip as Template                                          ✕   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Template Name                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 2-Week Europe Backpacking                                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Description                                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Classic European backpacking route through Paris, Amsterdam, │   │
│  │ Berlin, and Prague. Budget-friendly hostels and trains.      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Category                                                           │
│  ┌──────────────────────────┐                                      │
│  │ Backpacking           ▼  │                                      │
│  └──────────────────────────┘                                      │
│                                                                     │
│  What to Include:                                                   │
│  ☑ Destinations & dates (relative)                                 │
│  ☑ Journeys                                                        │
│  ☑ Activities                                                      │
│  ☐ Expenses (as estimates)                                         │
│  ☐ Packing list                                                    │
│                                                                     │
│  Visibility                                                         │
│  ○ Private - Only visible to me                                    │
│  ● Public - Share with community                                   │
│                                                                     │
│                            [Cancel]  [Save Template]               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Create Trip - Template Selection

```
┌─────────────────────────────────────────────────────────────────────┐
│ Create New Trip                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  How would you like to start?                                       │
│                                                                     │
│  ┌───────────────────────────┐  ┌───────────────────────────┐      │
│  │                           │  │                           │      │
│  │    📝                      │  │    📋                      │      │
│  │                           │  │                           │      │
│  │   Start from Scratch      │  │   Use a Template          │      │
│  │                           │  │                           │      │
│  │   Create a blank trip     │  │   Browse templates or     │      │
│  │   and add your own        │  │   use one of your saved   │      │
│  │   destinations            │  │   templates               │      │
│  │                           │  │                           │      │
│  └───────────────────────────┘  └───────────────────────────┘      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Template Browser

```
┌─────────────────────────────────────────────────────────────────────┐
│ Browse Templates                                               ✕   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 🔍 Search templates...                                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  [My Templates]  [Popular]  [By Region]  [By Type]                 │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  My Templates (3)                                                   │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ 🎒 2-Week Europe Backpacking                                │    │
│  │ Paris → Amsterdam → Berlin → Prague                        │    │
│  │ 14 days • 4 destinations • 6 journeys                      │    │
│  │                                        [Use] [Edit] [Delete]│    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ 🏖️ Thailand Beach Hopping                                   │    │
│  │ Bangkok → Phuket → Krabi → Koh Samui                       │    │
│  │ 10 days • 4 destinations • 4 journeys                      │    │
│  │                                        [Use] [Edit] [Delete]│    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  Popular Templates                                                  │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ ⭐ Classic Italy Tour                          ★★★★★ (127)  │    │
│  │ Rome → Florence → Venice → Milan                           │    │
│  │ 12 days • 4 destinations • Budget: ~$2,500                 │    │
│  │ by @traveler123                               [Use] [Preview]│    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Template Preview

```
┌─────────────────────────────────────────────────────────────────────┐
│ Template Preview                                               ✕   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ⭐ Classic Italy Tour                                              │
│  by @traveler123 • ★★★★★ (127 uses)                                │
│                                                                     │
│  Perfect 12-day introduction to Italy covering the major cities    │
│  with a mix of history, art, and cuisine.                          │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  📍 Destinations                                                    │
│                                                                     │
│  Day 1-4:  Rome                                                     │
│            • Colosseum tour                                         │
│            • Vatican Museums                                        │
│            • Trastevere food tour                                   │
│                                                                     │
│  Day 4-7:  Florence                                                 │
│            • Uffizi Gallery                                         │
│            • Tuscan day trip                                        │
│            • Duomo climb                                            │
│                                                                     │
│  Day 7-10: Venice                                                   │
│            • Grand Canal tour                                       │
│            • Murano glass workshop                                  │
│            • St. Mark's Square                                      │
│                                                                     │
│  Day 10-12: Milan                                                   │
│            • Last Supper viewing                                    │
│            • Fashion district                                       │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  🚆 Journeys                                                        │
│  Rome → Florence (Train, ~1.5h)                                    │
│  Florence → Venice (Train, ~2h)                                    │
│  Venice → Milan (Train, ~2.5h)                                     │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  💰 Estimated Budget: $2,500 - $3,500                               │
│                                                                     │
│                     [Cancel]  [Use This Template]                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Customize Template Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│ Create Trip from Template                                      ✕   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Using: Classic Italy Tour                                          │
│                                                                     │
│  Trip Name                                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ My Italy Adventure 2024                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Start Date                                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 📅 June 15, 2024                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  (End date will be calculated: June 27, 2024)                      │
│                                                                     │
│  Budget                                                             │
│  ┌────────────────────┐                                            │
│  │ $ 3000              │  USD                                       │
│  └────────────────────┘                                            │
│                                                                     │
│  Include from template:                                             │
│  ☑ Destinations (4)                                                │
│  ☑ Journeys (3)                                                    │
│  ☑ Activities (12)                                                 │
│  ☐ Packing list (24 items)                                         │
│                                                                     │
│  ⚠️ Dates will be adjusted based on your start date                │
│  ⚠️ Expenses will be copied as estimates for you to update         │
│                                                                     │
│                          [Cancel]  [Create Trip]                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Model

### TripTemplate (new table)
| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| user_id | Integer | FK to users (creator) |
| name | String(200) | Template name |
| description | Text | Template description |
| category | String(50) | backpacking, luxury, family, business, etc. |
| duration_days | Integer | Total trip duration |
| estimated_budget_min | Decimal | Minimum budget estimate |
| estimated_budget_max | Decimal | Maximum budget estimate |
| is_public | Boolean | Whether template is publicly visible |
| use_count | Integer | Number of times template was used |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |

### TemplateDestination (new table)
| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| template_id | Integer | FK to trip_templates |
| name | String(200) | Destination name |
| day_offset_start | Integer | Days from trip start |
| day_offset_end | Integer | Days from trip start |
| notes | Text | Description/notes |
| order_index | Integer | Order in template |

### TemplateJourney (new table)
| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| template_id | Integer | FK to trip_templates |
| origin_name | String(200) | Origin location |
| destination_name | String(200) | Destination location |
| transport_mode | String(50) | flight, train, bus, car, etc. |
| estimated_duration | String(50) | "~2 hours" etc. |
| estimated_cost | Decimal | Cost estimate |
| notes | Text | Travel tips |

### TemplateActivity (new table)
| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| template_destination_id | Integer | FK to template_destinations |
| name | String(200) | Activity name |
| description | Text | Activity description |
| estimated_cost | Decimal | Cost estimate |
| duration_hours | Decimal | Estimated duration |

## API Endpoints

### Templates
```
GET    /api/templates                    # List templates (with filters)
GET    /api/templates/{id}               # Get template details
POST   /api/templates                    # Create template from trip
PUT    /api/templates/{id}               # Update template
DELETE /api/templates/{id}               # Delete template

POST   /api/templates/{id}/use           # Create trip from template

GET    /api/templates/popular            # Get popular public templates
GET    /api/templates/my                 # Get user's templates
```

### Request/Response Examples

```json
// POST /api/templates (Create from trip)
{
  "trip_id": 123,
  "name": "2-Week Europe Backpacking",
  "description": "Classic European backpacking route...",
  "category": "backpacking",
  "is_public": true,
  "include_destinations": true,
  "include_journeys": true,
  "include_activities": true,
  "include_packing_list": false
}

// POST /api/templates/{id}/use
{
  "trip_name": "My Italy Adventure 2024",
  "start_date": "2024-06-15",
  "budget": 3000,
  "include_journeys": true,
  "include_activities": true,
  "include_packing_list": false
}

// Response
{
  "trip_id": 456,
  "message": "Trip created successfully from template"
}
```

## Frontend Components

```
frontend/components/templates/
├── TemplateBrowser.tsx       # Browse/search templates
├── TemplateCard.tsx          # Template preview card
├── TemplatePreview.tsx       # Full template preview modal
├── SaveAsTemplate.tsx        # Save trip as template modal
├── UseTemplateModal.tsx      # Customize and create from template
├── TemplateCategories.tsx    # Category filter pills
├── useTemplates.ts           # Hook for template operations
└── index.ts
```

## Acceptance Criteria

- [ ] Save any trip as a template via menu option
- [ ] Choose what to include when saving (destinations, journeys, activities, packing)
- [ ] Set template visibility (private/public)
- [ ] Browse personal templates
- [ ] Browse popular public templates
- [ ] Search templates by name/destination
- [ ] Filter templates by category
- [ ] Preview template before using
- [ ] Create trip from template with date adjustment
- [ ] Customize what to include from template
- [ ] Track template usage count
- [ ] Edit/delete own templates

## Implementation Notes

- Dates in templates are stored as relative offsets (day 0, day 1, etc.)
- When creating from template, apply start date offset to all dates
- Expenses are copied as "estimated" status
- Consider caching popular templates for performance
- Add rate limiting to prevent template spam

## Future Enhancements

- Template ratings and reviews
- Template versioning (update template, notify users)
- Collaborative template editing
- AI-suggested templates based on preferences
- Template marketplace with premium templates
- Template forking (copy and modify public template)
