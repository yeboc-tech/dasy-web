# Flexible Label System Design Documentation

**Date:** 2025-11-09
**Project:** dasy-web
**Goal:** Create a flexible labeling system that allows teachers to create custom taxonomies and relationships

---

## Table of Contents
1. [Problem Statement](#problem-statement)
2. [Design Requirements](#design-requirements)
3. [Architecture Decisions](#architecture-decisions)
4. [Final Schema](#final-schema)
5. [Migration Strategy](#migration-strategy)
6. [Implementation Roadmap](#implementation-roadmap)

---

## Problem Statement

### Current Limitations (Hard-coded Schema)

```
subjects (11 rows) - fixed table
chapters (40 rows) - fixed table with parent_id
problems.difficulty - hard-coded column
problems.problem_type - hard-coded column
problems.tags[] - flat array, no structure
problem_subjects - junction table
```

**Issues:**
- ❌ Can't add new categorization dimensions without schema changes
- ❌ Can't create custom taxonomies
- ❌ Can't define relationships between concepts
- ❌ Teachers have no control over metadata structure
- ❌ Single curriculum only (no support for 2015 vs 2022 개정)

### What Teachers Need

1. **Curriculum flexibility:** Support multiple curricula (2015 개정, 2022 개정, custom)
2. **Publisher-based filtering:** Subjects available depend on curriculum + publisher
3. **Curriculum-scoped tags:** Different tag vocabularies per curriculum
4. **Hierarchical organization:** Units → sub-units → concepts (unlimited depth)
5. **Complex relationships:** Prerequisites, related concepts, filtering rules
6. **Future extensibility:** Unknown relationship types that emerge later

---

## Design Requirements

### Core Requirements

1. Create curriculum trees: `2015 개정 → 경제 → 교학사 → 시장경제 → 수요와공급`
2. Support multiple independent trees (curriculum, difficulty, skills, etc.)
3. Tags scoped to curriculum: "수요곡선" valid only in 2015 curriculum
4. Publisher filters subjects: If curriculum=2015 AND publisher=교학사, show specific subjects
5. Tag hierarchies: Concept tags can have sub-concepts

### Design Principles

- ✅ **Flexible:** Add new label types without schema changes
- ✅ **Extensible:** Support unknown future relationship types
- ✅ **Clean:** Separation of concerns (problems vs metadata)
- ✅ **Maintainable:** Tree restructuring doesn't break problem assignments
- ✅ **Industry-standard:** Based on proven patterns (WordPress, Drupal, graph DBs)

---

## Architecture Decisions

### Key Design Questions We Resolved

#### 1. Context vs Hierarchy

**Question:** Should tags be scoped using explicit context field or implicit tree ancestry?

**Decision:** Use `label_relationships` with flexible `relationship_type`
- More flexible than context field
- Supports N-types of relationships, not just scoping
- Can add relationship types without schema changes

#### 2. Storage Strategy

**Question:** Store full path or just leaf node for problem assignments?

**Decision:** Store just leaf node
- Tree changes don't cascade to problem assignments
- Query ancestors with recursive CTEs when needed
- Clean data model (single source of truth)

**Trade-off accepted:** Slightly more complex queries, but Postgres handles recursive CTEs efficiently

#### 3. Relationship Model

**Question:** Parent-child only, or flexible relationship types?

**Decision:** Hybrid approach
- `parent_label_id` in `labels` table for simple hierarchies (fast queries)
- `label_relationships` table for complex relationships (scoping, filtering, prerequisites)

**Result:** Can represent:
- Simple trees: parent_label_id (efficient)
- Scoping: "Tag X scoped_to Curriculum Y"
- Filtering: "Publisher P provides Subject S when Curriculum C"
- Prerequisites: "Concept A requires Concept B"
- Related concepts: "Tag X related_to Tag Y"
- Future types: Add without schema changes

#### 4. Label Structure Types Considered

| Type | Description | Use Case | Tree Issues? |
|------|-------------|----------|--------------|
| Type 1: Single-Select Flat | Pick one, no hierarchy | Difficulty (상/중/하) | No ✅ |
| Type 2: Multi-Select Flat | Pick multiple, no hierarchy | Skills, methods | No ✅ |
| Type 3: Single-Select Hierarchical | Pick ONE path | Not needed | Yes ❌ |
| Type 4: Multi-Select Hierarchical | Tag at multiple levels | Curriculum placement | No ✅ |
| Type 5: Contextual Multi-Path | Separate namespaces | Not needed (handled by relationships) | N/A |

**Chosen:** Support all via flexible relationship model

---

## Final Schema

### Core Tables (4 total)

```sql
-- 1. Label Types (Meta: Define categories)
CREATE TABLE label_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Labels (Actual values)
CREATE TABLE labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label_type_id UUID NOT NULL REFERENCES label_types(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  parent_label_id UUID REFERENCES labels(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(label_type_id, value, parent_label_id)
);

-- 3. Label Relationships (Flexible graph edges)
CREATE TABLE label_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  to_label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_label_id, to_label_id, relationship_type),
  CHECK (from_label_id != to_label_id)
);

-- 4. Problem Labels (Problem assignments)
CREATE TABLE problem_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata JSONB,
  UNIQUE(problem_id, label_id)
);
```

### Relationship Types We'll Support

```sql
-- Common relationship types (extensible):

"child_of"      -- Hierarchy (alternative to parent_label_id)
"scoped_to"     -- Tag available only in this context
"provides"      -- Publisher provides this subject
"requires"      -- Prerequisite relationship
"related_to"    -- Semantic similarity
"filters"       -- Conditional availability
"equivalent_to" -- Same concept, different curricula
-- ... more types added as needed without schema changes
```

---

## Migration Strategy

### Current Data → New System Mapping

| Current Schema | → | New System |
|----------------|---|------------|
| `subjects` table (11 rows) | → | `label_type: "subject"` + 11 labels |
| `chapters` table (40 rows) | → | `label_type: "chapter"` + 40 labels (hierarchy preserved) |
| `problems.difficulty` column | → | `label_type: "difficulty"` + 3 labels (상/중/하) |
| `problems.tags[]` array | → | `label_type: "tag"` + N labels (one per unique tag) |
| `problem_subjects` junction | → | `problem_labels` (subject assignments) |
| (new) | → | `label_type: "curriculum"` + labels (2015/2022) |
| (new) | → | `label_type: "publisher"` + labels (교학사, 비상교육, etc.) |

### Migration Phases

**Phase 1: Additive (Safe)**
- ✅ Create new label tables
- ✅ Migrate existing data to new system
- ✅ Keep old schema intact
- ✅ Application reads from both
- ✅ Run parallel for 1-2 months

**Phase 2: Transition**
- Update UI to use new label system
- Teachers start creating custom labels
- Validate data integrity

**Phase 3: Cleanup (Optional)**
- Drop old columns: `problems.difficulty`, `problems.tags[]`, `problems.problem_type`
- Drop old tables: `subjects`, `chapters`, `problem_subjects`
- Application fully on new system

### Migration Script Outline

```sql
-- Step 1: Create label types
INSERT INTO label_types (name, description) VALUES
  ('curriculum', '교육과정'),
  ('subject', '과목'),
  ('publisher', '출판사'),
  ('chapter', '단원'),
  ('tag', '개념태그'),
  ('difficulty', '난이도'),
  ('problem_type', '문제유형');

-- Step 2: Migrate subjects → labels
INSERT INTO labels (label_type_id, value)
SELECT (SELECT id FROM label_types WHERE name = 'subject'), name
FROM subjects;

-- Step 3: Migrate chapters → labels (preserve hierarchy)
-- Step 4: Migrate difficulty values → labels
-- Step 5: Migrate tags → labels
-- Step 6: Migrate problem_subjects → problem_labels
-- Step 7: Create curriculum labels (new!)
-- Step 8: Link subjects to curriculum via label_relationships
```

---

## Implementation Roadmap

### Table-by-Table Implementation Plan

We will implement one table at a time with corresponding admin UI:

#### **Step 1: `label_types` table + Admin**
- [ ] Create migration for `label_types` table
- [ ] Create admin page: List label types
- [ ] Create admin page: Create/edit/delete label types
- [ ] Seed initial types (curriculum, subject, publisher, chapter, tag, difficulty)

#### **Step 2: `labels` table + Admin**
- [ ] Create migration for `labels` table
- [ ] Create admin page: List labels (filterable by type)
- [ ] Create admin page: Create/edit/delete labels
- [ ] Support parent-child hierarchy in UI (tree view)
- [ ] Migrate existing subjects → labels
- [ ] Migrate existing chapters → labels

#### **Step 3: `label_relationships` table + Admin**
- [ ] Create migration for `label_relationships` table
- [ ] Create admin page: View relationships (graph visualization?)
- [ ] Create admin page: Create relationships between labels
- [ ] Support relationship types dropdown
- [ ] Add metadata editor (JSONB)

#### **Step 4: `problem_labels` table + Admin**
- [ ] Create migration for `problem_labels` table
- [ ] Update problem admin page: Multi-label assignment UI
- [ ] Curriculum-aware tag selection (scoped tags)
- [ ] Publisher-based subject filtering
- [ ] Migrate existing problem_subjects → problem_labels
- [ ] Migrate existing difficulty/tags → problem_labels

#### **Step 5: Integration & Polish**
- [ ] Update problem list page: Filter by labels
- [ ] Update worksheet builder: Filter by label combinations
- [ ] Add label analytics dashboard
- [ ] Performance optimization (indexes, query tuning)
- [ ] Teacher documentation

---

## Example Data Structure (After Migration)

```sql
-- Label Types
label_types:
  id: 1, name: "curriculum"
  id: 2, name: "subject"
  id: 3, name: "publisher"
  id: 4, name: "chapter"
  id: 5, name: "tag"
  id: 6, name: "difficulty"

-- Labels (simplified)
labels:
  id: 10, type: 1 (curriculum), value: "2015 개정"
  id: 11, type: 1 (curriculum), value: "2022 개정"
  id: 20, type: 2 (subject), value: "경제", parent: null
  id: 21, type: 2 (subject), value: "생활과윤리", parent: null
  id: 30, type: 3 (publisher), value: "교학사"
  id: 31, type: 3 (publisher), value: "비상교육"
  id: 40, type: 4 (chapter), value: "시장경제", parent: 20 (경제)
  id: 50, type: 5 (tag), value: "수요곡선"
  id: 60, type: 6 (difficulty), value: "상"

-- Label Relationships
label_relationships:
  from: 20 (경제), to: 10 (2015), type: "child_of"
  from: 50 (수요곡선), to: 10 (2015), type: "scoped_to"
  from: 30 (교학사), to: 20 (경제), type: "provides",
    metadata: {"curriculum": "2015 개정"}

-- Problem Labels
problem_labels:
  problem: A, label: 10 (2015 개정)
  problem: A, label: 20 (경제)
  problem: A, label: 40 (시장경제)
  problem: A, label: 50 (수요곡선)
  problem: A, label: 60 (상)
```

---

## Why This Design is Industry-Standard

### Used By Major Platforms

- **WordPress:** `posts` + `terms` + `term_relationships` (same pattern!)
- **Drupal:** `nodes` + `taxonomy_terms` + relationships
- **Knowledge Graphs:** RDF triples (subject-predicate-object)
- **Graph Databases:** Property graph model (nodes + typed edges)

### Validation Against Best Practices

- ✅ **Normal Forms:** 3NF compliant, no redundancy
- ✅ **SOLID Principles:** Single responsibility, open/closed for extension
- ✅ **Graph Theory:** Directed graph with typed edges, supports DAGs
- ✅ **Scalability:** Proven to handle millions of relationships (WordPress, etc.)
- ✅ **Query Performance:** Postgres recursive CTEs are highly optimized

### Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Complex queries | Recursive CTEs, materialized views, indexes |
| Unknown future needs | Extensible via relationship types + JSONB metadata |
| Performance at scale | Proven pattern, Postgres handles well, closure tables if needed |
| Teacher confusion | Progressive disclosure in UI, good documentation |
| Migration complexity | Parallel run, gradual transition |

**Risk Level:** LOW
**Future-Proof Level:** HIGH
**Industry Validation:** STRONG

---

## Next Steps

### Immediate Actions (Today)

1. ✅ Finalize schema design ← **DONE**
2. ⏳ Create migration file for `label_types`
3. ⏳ Create basic admin UI for label type management
4. ⏳ Seed initial label types

### This Week

- Implement `labels` table + admin UI
- Migrate existing subjects/chapters
- Test label creation workflow with teachers

### This Month

- Complete all 4 tables
- Full admin UI for label management
- Begin teacher beta testing
- Gather feedback for relationship types needed

---

## Technical Notes

### Query Patterns

**Get all ancestors of a label:**
```sql
WITH RECURSIVE ancestors AS (
  SELECT id, value, parent_label_id, 0 as depth
  FROM labels WHERE id = :label_id
  UNION
  SELECT l.id, l.value, l.parent_label_id, depth + 1
  FROM labels l
  JOIN ancestors a ON l.id = a.parent_label_id
)
SELECT * FROM ancestors ORDER BY depth DESC;
```

**Get all descendants of a label:**
```sql
WITH RECURSIVE descendants AS (
  SELECT id, value, parent_label_id, 0 as depth
  FROM labels WHERE id = :label_id
  UNION
  SELECT l.id, l.value, l.parent_label_id, depth + 1
  FROM labels l
  JOIN descendants d ON l.parent_label_id = d.id
)
SELECT * FROM descendants;
```

**Get labels scoped to curriculum:**
```sql
SELECT l.*
FROM label_relationships lr
JOIN labels l ON lr.from_label_id = l.id
WHERE lr.to_label_id = (SELECT id FROM labels WHERE value = '2015 개정')
  AND lr.relationship_type = 'scoped_to';
```

### Performance Considerations

- Indexes on foreign keys (created by default)
- GIN indexes on JSONB metadata fields
- Consider materialized closure table if hierarchies >5 levels deep
- Cache common queries at application level

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-11-09 | Use label_relationships instead of context field | More flexible, supports N relationship types |
| 2025-11-09 | Store leaf node only in problem_labels | Cleaner model, tree changes don't cascade |
| 2025-11-09 | Hybrid: parent_label_id + label_relationships | Simple hierarchies fast, complex relationships flexible |
| 2025-11-09 | JSONB metadata fields | Future-proof without schema changes |
| 2025-11-09 | 4-table design (types, labels, relationships, assignments) | Industry standard, proven scalable |

---

## Resources & References

- [PostgreSQL Recursive Queries](https://www.postgresql.org/docs/current/queries-with.html)
- [WordPress Taxonomy System](https://developer.wordpress.org/plugins/taxonomies/)
- [Graph Database Concepts](https://neo4j.com/developer/graph-database/)
- [RDF/RDFS Specification](https://www.w3.org/TR/rdf-schema/)

---

**Document Status:** ✅ Approved
**Next Review:** After Step 1 implementation
**Maintained By:** Development team + domain experts (teachers)
