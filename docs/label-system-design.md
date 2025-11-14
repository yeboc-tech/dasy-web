# Label System Design - Flat Labels with Relationships

## Date: 2025-11-09

## The Problem We Identified

We discovered confusion between two different uses of labels:

### Pattern 1: Label as Category (works fine)
```
label_type: subject
label values: [Economics, Ethics, Politics]

Problem #123 → subject: Economics
```
✅ Simple categorization

### Pattern 2: Label as Context-Dependent Property (doesn't work)
```
label_type: correct_rate
BUT...

Problem #123:
  - In curriculum 2015 → correct_rate: 70
  - In curriculum 2022 → correct_rate: 45
```
❌ Current system can't handle context-dependent values!

### The Root Issue

**Correct rate is not a category - it's a PROPERTY that varies by context.**

Same problem has different correct rates depending on which curriculum/context you're looking at.

---

## Our Solution: Flat Labels + Relationships

### Core Principle
> **Everything is a label. Problems see flat labels. Relationships add meaning.**

### How It Works

#### 1. Flat Label Assignment
Problems have a simple flat list of labels:
```
Problem #123 has labels:
  - curriculum:2015
  - subject:Economics
  - correct_rate:70
  - tag:supply-demand
```

#### 2. Relationships Provide Context
Relationships describe connections between labels:
```
label_relationships:
  curriculum:2015 → typical_correct_rate → correct_rate:70
  curriculum:2022 → typical_correct_rate → correct_rate:45

  subject:Economics → includes_tag → tag:supply-demand
  tag:supply-demand → requires → tag:market-basics
```

#### 3. Label Types = UI Grouping Only
```
label_types exist to:
  - Help teachers find labels by category
  - Show appropriate input (number vs text)
  - Organize labels in the UI

They have NO effect on data structure or querying.
```

---

## Database Schema (Already Exists!)

```sql
-- Grouping/organization (UI only)
label_types:
  - id
  - name (curriculum, subject, correct_rate, etc.)
  - description
  - value_type (categorical, numeric)
  - value_constraints (JSONB: {min, max, step, unit})

-- The actual labels (flat)
labels:
  - id
  - label_type_id
  - value (text: "2015", "Economics", "70")
  - parent_label_id (for hierarchies within same type)
  - display_order
  - metadata (JSONB)

-- Flat many-to-many (no context here!)
problem_labels:
  - problem_id
  - label_id

-- Semantic connections between labels
label_relationships:
  - id
  - from_label_id
  - to_label_id
  - relationship_type (typical_correct_rate, includes_tag, requires, etc.)
```

---

## User Workflows

### Creating Labels

**For categorical types (existing):**
1. Create label_type "subject"
2. Manually create labels: Economics, Ethics, Politics

**For numeric types (new):**
1. Create label_type "correct_rate" with constraints {min: 0, max: 100, unit: "%"}
2. Labels auto-created on-demand when teacher enters "70"

### Creating Relationships

**Example: "For curriculum 2015, typical correct rate is 70%"**

1. Go to label relationships page
2. From: `curriculum:2015`
3. Type: `typical_correct_rate`
4. To: `correct_rate:70`
5. Save

### Assigning Labels to Problems

**Option A: Manual (simple, always works)**
1. Teacher selects Problem #123
2. Add label: `curriculum:2015`
3. Add label: `correct_rate:70`
4. Both labels stored in `problem_labels` (flat)

**Option B: Assisted by Relationships (smart UI)**
1. Teacher selects Problem #123
2. Add label: `curriculum:2015`
3. UI shows suggestion: "💡 Add correct_rate:70?" (based on relationship)
4. Teacher clicks yes → both labels added

### Querying

**Simple queries (just use flat labels):**
```sql
-- Find problems with correct_rate = 70
SELECT p.* FROM problems p
JOIN problem_labels pl ON p.id = pl.problem_id
JOIN labels l ON pl.label_id = l.id
JOIN label_types lt ON l.label_type_id = lt.id
WHERE lt.name = 'correct_rate' AND l.value = '70'
```

**Insights using relationships:**
```sql
-- What's the typical correct rate for curriculum 2015?
SELECT to_label.value
FROM label_relationships lr
JOIN labels from_label ON lr.from_label_id = from_label.id
JOIN labels to_label ON lr.to_label_id = to_label.id
WHERE from_label.value = '2015'
AND lr.relationship_type = 'typical_correct_rate'
```

---

## Benefits of This Design

✅ **Simple data model** - Flat labels, easy to query
✅ **Flexible** - Can represent any relationship between labels
✅ **No special cases** - correct_rate treated same as any other label
✅ **UI can be smart** - Use relationships to suggest related labels
✅ **Future-proof** - Add new relationship types anytime (part_of, conflicts_with, etc.)
✅ **Performance** - Flat structure is fast, relationships are optional for complex queries

---

## Implementation Status

### ✅ Completed
1. Database migration: Added `value_type` and `value_constraints` to `label_types`
2. Label types UI: Can create numeric types with constraints
3. Navigation cleanup: Removed '관리', pure Korean headers
4. All 4 core tables exist: `label_types`, `labels`, `problem_labels`, `label_relationships`

### ⏳ In Progress
- Label types page UI for value_type (mostly done)

### 📋 Todo
1. **Labels page: Numeric input support**
   - When label_type is numeric, show number input with constraints
   - Auto-create labels on-demand (no need to pre-create 0-100)

2. **Label relationships page**
   - Table-based CRUD for relationships
   - From label → Relationship type → To label

3. **Problems page: Label assignment**
   - UI to assign labels to problems
   - Smart suggestions based on relationships

4. **Navbar reorder**
   - Change to: 문제 | 라벨 | 라벨 타입

---

## Key Design Decisions

### Why Flat Labels?
- **Simplicity**: No nested contexts, just tags
- **Flexibility**: Relationships provide structure without rigid hierarchy
- **Query Performance**: Simple JOINs, no recursive queries needed

### Why Relationships?
- **Semantic Meaning**: Connect related labels (curriculum ↔ typical correct_rate)
- **UI Intelligence**: Suggest relevant labels when assigning to problems
- **Data Insights**: Analyze patterns (which tags correlate with difficulty?)

### Why Label Types Still Matter?
- **Organization**: Find labels quickly ("show me all subjects")
- **Validation**: Numeric types have constraints (0-100)
- **UI Adaptation**: Show number input vs text input vs dropdown

---

## Examples of Relationships

```
Relationship Types:

1. typical_correct_rate
   curriculum:2015 → correct_rate:70
   curriculum:2022 → correct_rate:45

2. includes_tag
   subject:Economics → tag:supply-demand
   subject:Ethics → tag:moral-philosophy

3. requires (prerequisites)
   tag:advanced-calculus → tag:basic-calculus
   tag:supply-demand → tag:market-basics

4. conflicts_with
   curriculum:2015 → curriculum:2022

5. part_of (hierarchical)
   unit:Market-Economy → subject:Economics
   chapter:Supply-Demand → unit:Market-Economy
```

---

## Next Steps

1. Finish numeric label creation UI (labels page)
2. Build label relationships management page
3. Build problem labeling interface
4. Test the full workflow end-to-end
5. Consider: Bulk operations (import labels, auto-create relationships)

---

## Questions to Revisit Later

1. Should we limit which label_types can have relationships?
2. Do we need relationship constraints? (e.g., "correct_rate can only relate to curriculum")
3. Should relationships be directional or bidirectional?
4. How to handle relationship conflicts? (curriculum:2015 has TWO typical_correct_rate values)
5. Do we need versioning/history for relationships?

---

## References

- Migration: `supabase/migrations/20251109042805_add_value_type_to_label_types.sql`
- Label types page: `app/admin/label-types/page.tsx`
- Labels page: `app/admin/labels/page.tsx`
- Original flexible schema: `supabase/migrations/20251109030154_create_flexible_label_system.sql`
