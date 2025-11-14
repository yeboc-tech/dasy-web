-- Create edited_contents table for storing edited problem/answer images
CREATE TABLE IF NOT EXISTS edited_contents (
  resource_id text PRIMARY KEY,
  json jsonb,
  base64 text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add comments
COMMENT ON TABLE edited_contents IS '문제 및 답안의 편집된 콘텐츠 저장';
COMMENT ON COLUMN edited_contents.resource_id IS '리소스 고유 ID (문제_id 또는 answer_id)';
COMMENT ON COLUMN edited_contents.json IS '편집된 콘텐츠 JSON 데이터';
COMMENT ON COLUMN edited_contents.base64 IS 'Base64 인코딩된 이미지 또는 파일 데이터';
COMMENT ON COLUMN edited_contents.created_at IS '생성 일시';
COMMENT ON COLUMN edited_contents.updated_at IS '수정 일시';

-- Disable RLS for now (can enable later if needed)
ALTER TABLE edited_contents DISABLE ROW LEVEL SECURITY;
