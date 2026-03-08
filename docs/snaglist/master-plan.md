# Master Snaglist Plan

This document consolidates the remaining missing architectural components and uncompleted features found across all recent audits into a single implementation plan.

## Remaining Issues

1. **Trip Wizard Architecture**
   - Missing **Expense Route Database Link-Tables** (`transport_expenses`, `stop_expenses` links)
   - Missing the **Exchange Rate Backend Service** (`app/services/exchange_rate.py` cron jobs and routing).
2. **Day Builder / Cleanup**
   - Missing the `useUserSettings.ts` custom React hook. 
   - Missing the `/` to `/dashboard` root route redirection logic update.
3. **Destination Day Link**
   - Missing the backend testing suite `tests/test_home_base_geocode.py`. 
4. **Location Validation**
   - Missing validation state logic inside `frontend/components/destinations/useDestinationForm.ts` to surface the `locationWarning` property underneath the `DestinationForm.tsx` components.

---

## Phases of Implementation

### Phase 1: Day Builder / Cleanup (Frontend Configuration & Hooks)
* **Goal**: Implement standard user settings and root redirect routing.
* **Tasks**:
  1. Add a Next.js `redirect` in `frontend/app/page.tsx` or `next.config.js` to redirect the root `/` path to `/dashboard`.
  2. Implement the `useUserSettings.ts` custom hook in `frontend/lib/` or `frontend/components/` to gracefully fetch user default parameters (like currency or timezone preferences).
* **Tests**: Ensure frontend compiles and root path correctly navigates to the dashboard. Check if `useUserSettings.ts` works seamlessly when imported by consumer components.
* **Acceptance**: Visiting `/` successfully routes to `/dashboard` automatically. `useUserSettings` successfully fetches configuration or returns sane fallbacks.

### Phase 2: Location Validation UI Bindings
* **Goal**: Correctly surface geocoding lookup validation warnings in `DestinationForm.tsx`.
* **Tasks**:
  1. Update `frontend/components/destinations/useDestinationForm.ts` to fully expose the `locationWarning` state whenever geocoding verification detects ambiguities.
  2. Ensure `<DestinationForm>` seamlessly displays this warning alert underneath its location fields.
* **Tests**: Test typing an ambiguous destination name, intercepting the warning, and confirming the interface surfaces the feedback.
* **Acceptance**: Users see friendly warning messages natively rendered inside the Destination Form if their destination coordinates fallback to ambiguous regions.

### Phase 3: Destination Day Link (Backend Tests)
* **Goal**: Restore missing test coverage for `home_base_geocode`.
* **Tasks**:
  1. Create `tests/test_home_base_geocode.py`.
  2. Write Pytest cases covering missing branches related to home base geocoding fallbacks, making sure Mapbox geocoding mocks are asserted correctly.
* **Tests**: Execute `pytest tests/test_home_base_geocode.py -v`.
* **Acceptance**: Test suite passes giving full coverage confidence over the `home_base_geocode` functions.

### Phase 4: Trip Wizard Architecture (Complex Backend Services)
* **Goal**: Construct missing `transport_expenses` / `stop_expenses` links and Exchange Rate Service.
* **Tasks**:
  1. Generate database migrations establishing the missing Expense route database link-tables (`transport_expenses`, `stop_expenses`) alongside updated SQLAlchemy models.
  2. Develop `app/services/exchange_rate.py` to periodically fetch and persist unified exchange rates. Map this to an endpoints router.
* **Tests**: Execute `pytest` across both the new expense link schemas and the generic `exchange_rate` module.
* **Acceptance**: DB schema successfully holds reference links for transport and stop expenses. Exchange rate service allows API calls to safely convert currencies.

---

## Overall Testing & Acceptance
- Run full backend suite: `source .venv/bin/activate && pytest tests/ -v`
- Run frontend validation: `cd frontend && npm run lint && npx tsc --noEmit`
- Smoke test all changes comprehensively in the UI to ensure no regressions.
