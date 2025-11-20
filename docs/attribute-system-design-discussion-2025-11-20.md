# Attribute System Design Discussion - 2025-11-20

## Context
Discussion about designing a flexible, no-code attribute system for problem management that can handle both categorical and numeric attributes.

---

## Initial Problem: Numeric Labels Are Awkward

### The Trigger
When implementing numeric label types (e.g., "정답률" with min:0, max:100, unit:"%"), we realized:

**Problem:** If we create a label for every numeric value (0, 1, 2, ..., 100), we'd have 101 rows in the labels table.
- Doesn't scale
- Clutters the table
- Defeats the purpose

### Example Use Case
User wants to store "correct_rate per curriculum":
- Problem A has 75% in 2015 개정
- Same problem has 82% in 2022 개정
- Query: "Show problems with >80% in 2022 개정"

This is **contextual numeric data** - the value depends on which context (curriculum) you're looking at.

---

## Key Insight: Labels vs Attributes

### The Realization
**"Everything IS an attribute if you think about it"**
- curriculum = "2015 개정" ← attribute
- subject = "경제" ← attribute
- correct_rate = 75.5 ← attribute

So why distinguish them?

### The Real Distinction

**Categorical (current label system works well):**
```
Finite discrete values defined ahead of time:
- 2015 개정, 2022 개정
- 경제, 물리, 화학
- 고급, 중급, 기초

Storage: Separate rows in labels table
```

**Numeric (awkward in current system):**
```
Infinite continuous values that emerge from data:
- 0.0, 0.1, 0.2, ..., 99.9, 100.0
- Any decimal in between

Storage: ???
- Create 1000 label rows? No.
- Store value in junction table? Awkward.
```

---

## Current Database State

### Existing Tables (Production)

**problems table** (995 rows)
- Categorical: chapter_id, difficulty ('하'/'중'/'상'), problem_type, source, tags[]
- Numeric: correct_rate (int), answer (int), exam_year (int)
- Text: problem_filename, answer_filename, problem_text, answer_text
- Vectors: problem_embedding, answer_embedding

**subjects table** (11 rows)
- name (UNIQUE): "경제", "물리", etc.

**chapters table** (40 rows)
- name, parent_id (hierarchy), subject_id, chapter_number

**problem_subjects table** (996 rows)
- Junction: problem_id → subject_id

**accuracy_rate table** (2,380 rows)
- problem_id (text, natural key)
- accuracy_rate (numeric), score (int), difficulty (text)
- selection_rates (jsonb)

**problem_tags table** (1,651 rows)
- problem_id, type, tag_ids[], tag_labels[]

### NEW Label System (Recently Added)

**label_types table**
- name (UNIQUE), description
- value_type: "categorical" or "numeric"
- value_constraints: jsonb

**labels table**
- label_type_id, value (text)
- parent_label_id (hierarchy), display_order
- metadata: jsonb

**problem_labels table**
- problem_id, label_id
- assigned_by, metadata: jsonb

---

## The Vision: Unified Attribute System

### Goal
Build a flexible, no-code attribute system where:
- Admins can define ANY attribute type without touching code
- Attributes can be categorical, numeric, boolean, date, etc.
- Attributes can have relationships and hierarchies
- All problems can be tagged/attributed without developer involvement

### Terminology Shift
**"Label" → "Attribute" (속성)**
- More accurate: "Label" implies tags/categories only
- "Attribute" encompasses everything: categories, numbers, relationships
- Korean "속성" is much clearer than "라벨"

### Benefits
1. **Unified mental model:** "Problems have attributes"
2. **Extensible:** New attribute types without schema changes
3. **Self-documenting:** attribute_types defines what's possible
4. **User-friendly:** Non-developers can manage attributes

---

## Schema Design Options

### Current Proposal (Option C - EAV Pattern)
```sql
attribute_types:
  - name: "curriculum", "correct_rate", "difficulty", "subject"
  - value_type: "categorical", "numeric", "boolean", "date"
  - constraints: jsonb (min/max for numeric, allowed values for categorical)

attributes: (for categorical/predefined values only)
  - attribute_type_id
  - value: "2015 개정", "경제" (discrete, predefined)
  - parent_id (hierarchy)

problem_attributes: (junction + values)
  - problem_id
  - attribute_type_id (always required - what kind of attribute)
  - attribute_id (nullable - for categorical, points to predefined attribute)
  - value_numeric (nullable - for numeric types, actual number)
  - value_text (nullable - for free-form text)
  - metadata: jsonb (extensible)
```

**Awkwardness:** Multiple nullable columns in junction table

---

### Alternative: Option A (Separate Tables)
```sql
-- For categorical (predefined discrete values)
attributes:
  - attribute_type_id ("curriculum")
  - value: "2015 개정"
  - parent_id (hierarchy)

problem_attributes:
  - problem_id
  - attribute_id (just a link, clean junction)

-- For numeric (measured/continuous values)
problem_properties:
  - problem_id
  - property_type_id ("correct_rate")
  - value: 75.5
  - context: jsonb (optional metadata)
```

**Terminology:**
- **Attributes** (속성) = discrete classifications
- **Properties** (특성) = continuous measurements

**Benefits:**
- Clean separation, each system is clean
- No awkward nullable columns
- Each optimized for its purpose

**Drawbacks:**
- Not one unified system
- Two different admin UIs

---

### Alternative: Option B (Metadata Column)
```sql
attributes:
  - attribute_type_id
  - value: text (for categorical only, null for numeric types)

problem_attributes:
  - problem_id
  - attribute_id
  - metadata: jsonb (for numeric types, store {"value": 75.5})
```

**Awkwardness:** Using metadata as primary value storage feels hacky

---

### Alternative: Option D (Hybrid - Columns for Numeric)
```sql
-- Categorical: Use attribute system
attributes + problem_attributes (clean junction)

-- Numeric: Use dedicated columns
ALTER TABLE problems ADD COLUMN correct_rate_2015 numeric;
ALTER TABLE problems ADD COLUMN correct_rate_2022 numeric;
```

**Awkwardness:** Not flexible, requires migrations for new numeric attributes

---

## The Core Tension

**Categorical and numeric attributes are fundamentally different:**

| Aspect | Categorical | Numeric |
|--------|-------------|---------|
| **Values** | Finite, predefined | Infinite, continuous |
| **Storage** | Attribute row IS the value | Need to store actual number |
| **Junction** | Just needs a link | Needs to store value data |
| **Queries** | "Has attribute X" | "Value > threshold" |

**Forcing them into one schema creates awkwardness somewhere.**

---

## Open Questions

1. **Do we want one unified system (slightly awkward) or separate systems (each clean)?**

2. **If unified, which awkwardness is most acceptable?**
   - Multiple nullable columns in junction table (EAV)
   - Metadata as value storage
   - Something else?

3. **Terminology:**
   - One concept: "Attributes" for everything?
   - Two concepts: "Attributes" (categorical) + "Properties" (numeric)?

4. **For contextual numeric values** (e.g., correct_rate per curriculum):
   - How to model the context relationship?
   - Is context just another attribute relationship?

5. **Migration path:**
   - Rename existing label_* tables to attribute_*?
   - Or build new schema and migrate?

---

## Next Steps (To Be Decided)

1. Choose architectural approach (unified vs separate)
2. Design final schema
3. Plan migration from current label_* tables
4. Update admin UI terminology and features
5. Handle existing data

---

## Key Insight to Remember

**The awkwardness comes from trying to make one system do two fundamentally different things.**

The choice is:
- Accept some awkwardness for the benefit of unity
- Or embrace separation for the benefit of cleanliness

Both are valid. The question is: **What serves the user/use-case better?**
