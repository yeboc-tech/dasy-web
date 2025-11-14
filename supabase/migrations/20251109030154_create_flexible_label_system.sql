-- ============================================================================
-- Flexible Label System Migration
-- Created: 2025-11-09
-- Purpose: Create flexible labeling system for curriculum, subjects, tags, etc.
-- ============================================================================

-- ============================================================================
-- 1. Label Types Table (Meta: Define categories)
-- ============================================================================
CREATE TABLE label_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. Labels Table (Actual values)
-- ============================================================================
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

-- ============================================================================
-- 3. Label Relationships Table (Flexible graph edges)
-- ============================================================================
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

-- ============================================================================
-- 4. Problem Labels Table (Problem assignments)
-- ============================================================================
CREATE TABLE problem_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata JSONB,
  UNIQUE(problem_id, label_id)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Label Types
CREATE INDEX idx_label_types_name ON label_types(name);

-- Labels
CREATE INDEX idx_labels_type ON labels(label_type_id);
CREATE INDEX idx_labels_parent ON labels(parent_label_id);
CREATE INDEX idx_labels_value ON labels(value);
CREATE INDEX idx_labels_metadata ON labels USING GIN(metadata);

-- Label Relationships
CREATE INDEX idx_label_relationships_from ON label_relationships(from_label_id);
CREATE INDEX idx_label_relationships_to ON label_relationships(to_label_id);
CREATE INDEX idx_label_relationships_type ON label_relationships(relationship_type);
CREATE INDEX idx_label_relationships_metadata ON label_relationships USING GIN(metadata);

-- Problem Labels
CREATE INDEX idx_problem_labels_problem ON problem_labels(problem_id);
CREATE INDEX idx_problem_labels_label ON problem_labels(label_id);
CREATE INDEX idx_problem_labels_assigned_by ON problem_labels(assigned_by);

-- ============================================================================
-- Seed Initial Label Types
-- ============================================================================
INSERT INTO label_types (name, description) VALUES
  ('curriculum', 'Curriculum categories (e.g., 2015, 2022, custom)'),
  ('subject', 'Subjects (e.g., Economics, Ethics, Politics)'),
  ('publisher', 'Publishers (e.g., Kyohak, Visang, Chunjae)'),
  ('unit', 'Units/Chapters (hierarchical structure under subjects)'),
  ('tag', 'Concept tags (curriculum-scoped concepts and keywords)'),
  ('difficulty', 'Difficulty levels (e.g., high, medium, low)'),
  ('problem_type', 'Problem types (e.g., multiple choice, essay, short answer)'),
  ('skill', 'Skills/Competencies (e.g., critical thinking, data analysis)');

-- ============================================================================
-- Comments for Documentation
-- ============================================================================
COMMENT ON TABLE label_types IS 'Meta table defining label categories (curriculum, subject, tag, etc.)';
COMMENT ON TABLE labels IS 'Actual label values with optional parent-child hierarchy';
COMMENT ON TABLE label_relationships IS 'Flexible typed relationships between labels (scoped_to, provides, requires, etc.)';
COMMENT ON TABLE problem_labels IS 'Junction table assigning labels to problems';

COMMENT ON COLUMN labels.parent_label_id IS 'For simple hierarchies (e.g., unit under subject). Use label_relationships for complex relationships.';
COMMENT ON COLUMN labels.metadata IS 'Extensible JSON field for future attributes without schema changes';
COMMENT ON COLUMN label_relationships.relationship_type IS 'Examples: child_of, scoped_to, provides, requires, related_to, filters, equivalent_to';
COMMENT ON COLUMN label_relationships.metadata IS 'Additional context for relationships (e.g., {"curriculum": "2015"} for conditional provides)';
