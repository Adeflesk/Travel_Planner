# Architecture Review: Is the `Expense` Model overloaded?

## The Current State of `Expense`

Looking at `app/models/expense.py`, the `Expense` model currently has the following Foreign Keys:
- `trip_id` (Required)
- `destination_id` (Nullable)
- `activity_id` (Nullable)
- `segment_option_id` (Nullable)
- `stop_option_id` (Nullable)
- `segment_id` (Nullable)

If you add Accommodation features in the future, you will likely add `accommodation_id`.

## The Problem: "Exclusive Belongs To" Anti-Pattern

This design pattern is commonly known as the **"Exclusive Belongs To" (or "Mega-Link") anti-pattern**. 

### Why it feels wrong (and is problematic long-term):
1. **Table Bloat:** For every new feature that costs money (Accommodation, Car Rental, Insurance, Visas), you have to migrate the `expenses` table to add a new nullable column.
2. **Sparse Data:** A single expense record will have one populated foreign key and five `NULL` columns. This wastes semantic space and makes the schema messy.
3. **Weak Integrity:** There is no database-level constraint preventing an expense from being linked to *both* an `activity_id` and a `segment_id` simultaneously by mistake, meaning you have to enforce exclusivity in your application logic.

## Recommended Solutions

If you are feeling like you are asking "Expense" to do too much, your instinct is correct. Here are three standard architectural patterns to resolve this, ranked from easiest to best.

### Option 1: Reverse the Relationship (Recommended for Simplicity)
Instead of the `Expense` pointing to the feature (Segment, Activity, etc.), the feature points to the `Expense`.

**How it works:**
The `Expense` table strips away all the specific ID columns. It just becomes:
- `id`
- `trip_id`
- `amount`
- `category`
- `description`

Then, your other models get an `expense_id`:
- `JourneySegment.expense_id`
- `Activity.expense_id`
- `Accommodation.expense_id`

**Pros:** `Expense` becomes extremely clean. No more migrating the `expenses` table when you add a new feature.
**Cons:** If a single activity has *multiple* expenses (e.g., deposit + final payment), a single `expense_id` on the Activity model isn't enough. (If this is the case, use Option 3).

### Option 2: Polymorphic Associations (Generic Foreign Key)
Instead of 6 different nullable columns, you use two columns to point to *any* table in your database.

**How it works:**
The `Expense` table gets:
- `reference_type` (String: e.g., "activity", "segment", "accommodation")
- `reference_id` (Integer: The ID of that row in the respective table)

**Pros:** Very flexible. You only need 2 columns forever, no matter how many features you add.
**Cons:** You lose Database-level Foreign Key constraints. The database cannot enforce that `reference_id=5` for `reference_type='segment'` actually exists in the `journey_segments` table.

### Option 3: Link Tables (Recommended for strict DB integrity)
You create a specific join table for each relationship.

**How it works:**
`Expense` stays clean (just core fields).
You create tables like:
- `activity_expenses` (`activity_id`, `expense_id`)
- `segment_expenses` (`segment_id`, `expense_id`)

**Pros:** Extremely strong database integrity. Easy to handle multiple expenses per item.
**Cons:** Requires creating a lot of extra tables.

---

## Conclusion & Next Steps

You are absolutely right to question the current trajectory of the `Expense` model. 

**Recommendation:** Before implementing Accommodation, refactor the `Expense` data model. 

If an item (like a Segment or an Activity) only ever has **one** total cost, go with **Option 1**. It will instantly clean up your codebase.

If an item can have **multiple** expenses (like paying for an Accommodation in three separate installments), go with **Option 2** (Polymorphic) if you prefer fast development, or **Option 3** (Link Tables) if you prefer strict database rules.
