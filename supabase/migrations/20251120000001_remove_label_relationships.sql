-- Remove label_relationships table
-- We'll rely on parent_label_id for simple hierarchical relationships
-- and can add back more complex relationship types later if needed

DROP TABLE IF EXISTS label_relationships CASCADE;
