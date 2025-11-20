-- ============================================================================
-- Sync Local Database with Remote Production
-- Created: 2025-11-20
-- Purpose: Add missing tables from production to local database
-- ============================================================================

-- ============================================================================
-- 1. Accuracy Rate Table (Problem performance metrics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS accuracy_rate (
  problem_id TEXT PRIMARY KEY,
  correct_answer TEXT,
  difficulty TEXT,
  score INTEGER,
  accuracy_rate NUMERIC,
  selection_rates JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE accuracy_rate IS '시험 문제별 정답률 및 선지별 선택비율';
COMMENT ON COLUMN accuracy_rate.problem_id IS '문제 고유 ID (예: 경제_고3_2025_09_모평_1_문제)';
COMMENT ON COLUMN accuracy_rate.correct_answer IS '정답 (1~5)';
COMMENT ON COLUMN accuracy_rate.difficulty IS '난이도 (상/중상/중/중하/하, 메가스터디에서 가져옴)';
COMMENT ON COLUMN accuracy_rate.score IS '배점 (2 또는 3)';
COMMENT ON COLUMN accuracy_rate.accuracy_rate IS '정답률 (백분율 숫자, 예: 95.00)';
COMMENT ON COLUMN accuracy_rate.selection_rates IS '선지별 선택비율 JSON (예: {"1": 3.0, "2": 1.0, ...})';

-- ============================================================================
-- 2. Problem Tags Table (Tag metadata with types)
-- ============================================================================
CREATE TABLE IF NOT EXISTS problem_tags (
  problem_id TEXT NOT NULL,
  type TEXT NOT NULL,
  tag_ids TEXT[] NOT NULL,
  tag_labels TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (problem_id, type)
);

COMMENT ON TABLE problem_tags IS '시험 문제별 태그 정보';
COMMENT ON COLUMN problem_tags.problem_id IS '시험 문제 ID (예: 경제_고3_2024_03_학평_1_문제)';
COMMENT ON COLUMN problem_tags.type IS '태그 타입 (예: 마더텅_단원_태그, 자세한통사_단원_태그, 커스텀_태그 등)';
COMMENT ON COLUMN problem_tags.tag_ids IS '태그 ID 배열';
COMMENT ON COLUMN problem_tags.tag_labels IS '태그 라벨 배열 (사람이 읽을 수 있는 형태)';

-- ============================================================================
-- 3. Edited Contents Table (Stores edited problem/answer images)
-- ============================================================================
CREATE TABLE IF NOT EXISTS edited_contents (
  resource_id TEXT PRIMARY KEY,
  json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  base64 TEXT
);

COMMENT ON TABLE edited_contents IS '문제 및 답안의 편집된 콘텐츠 저장';
COMMENT ON COLUMN edited_contents.resource_id IS '리소스 고유 ID (문제_id 또는 answer_id)';
COMMENT ON COLUMN edited_contents.json IS '편집된 콘텐츠 JSON 데이터';
COMMENT ON COLUMN edited_contents.base64 IS 'Base64 인코딩된 이미지 또는 파일 데이터';
COMMENT ON COLUMN edited_contents.created_at IS '생성 일시';
COMMENT ON COLUMN edited_contents.updated_at IS '수정 일시';

-- ============================================================================
-- Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_problem_tags_problem_id ON problem_tags(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_tags_type ON problem_tags(type);

-- Disable RLS for edited_contents (matching production)
ALTER TABLE edited_contents DISABLE ROW LEVEL SECURITY;
