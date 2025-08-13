# Textbook Chapter Insertion Scripts

This directory contains scripts to insert the chapters for the two textbooks (통합사회 1 and 통합사회 2) into the database.

## Database Structure

The database has the following structure for chapters:

- **subjects** table: Contains the main textbooks
- **chapters** table: Contains chapters with hierarchical structure
  - `id`: UUID primary key
  - `name`: Chapter name (without numbers)
  - `chapter_number`: Integer for ordering (NEW)
  - `parent_id`: Reference to parent chapter (for sub-chapters)
  - `subject_id`: Reference to the subject/textbook

## Migration Steps

### Step 1: Add Chapter Number Column
First, run the migration to add the `chapter_number` column:

```sql
-- Run this in Supabase SQL Editor
-- File: add-chapter-number-migration.sql
```

This will:
- Add `chapter_number` INTEGER column
- Create index for better performance
- Add constraints for data integrity

### Step 2: Insert Chapters
Choose one of the following approaches:

## Available Scripts

### 1. Improved SQL Script (`insert-chapters-improved.sql`) - **RECOMMENDED**

**Usage**: Run directly in Supabase SQL Editor

**Features:**
- ✅ **Separates chapter numbers** from names
- ✅ **Better data structure** for ordering and filtering
- ✅ **Consistent formatting** across applications
- ✅ **Easy reordering** capabilities

**Example structure:**
```sql
-- Main units
INSERT INTO chapters (name, chapter_number, subject_id) VALUES 
('통합적 관점', 1, subject_1_id),
('인간, 사회, 환경과 행복', 2, subject_1_id);

-- Sub-chapters
INSERT INTO chapters (name, chapter_number, parent_id, subject_id) VALUES 
('인간, 사회, 환경을 바라보는 다양한 관점', 1, chapter_1_id, subject_1_id),
('통합적 관점의 필요성과 적용', 2, chapter_1_id, subject_1_id);
```

### 2. Original SQL Script (`insert-chapters.sql`)

**Usage**: Run directly in Supabase SQL Editor

**Features:**
- Numbers embedded in chapter names
- Simpler structure
- Matches current frontend expectations

### 3. Node.js Script (`insert-chapters.js`)

**Usage**: Run from command line

1. Make sure you have the required environment variables:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. Install dependencies if not already installed:
   ```bash
   npm install @supabase/supabase-js
   ```

3. Run the script:
   ```bash
   node scripts/insert-chapters.js
   ```

## Chapter Structure

### 통합사회 1 (Integrated Social Studies 1)
- **I. 통합적 관점** (Integrated Perspective)
  - 01. 인간, 사회, 환경을 바라보는 다양한 관점
  - 02. 통합적 관점의 필요성과 적용
- **II. 인간, 사회, 환경과 행복** (Human, Society, Environment and Happiness)
  - 01. 행복의 기준과 의미
  - 02. 행복한 삶을 실현하기 위한 조건
- **III. 자연환경과 인간** (Natural Environment and Humans)
  - 01. 자연환경과 인간 생활
  - 02. 인간과 자연의 관계
  - 03. 환경 문제 해결을 위한 다양한 노력
- **IV. 문화와 다양성** (Culture and Diversity)
  - 01. 세계의 다양한 문화권
  - 02. 문화 변동과 전통문화
  - 03. 문화 상대주의와 보편 윤리
  - 04. 다문화 사회와 문화적 다양성 존중
- **V. 생활공간과 사회** (Living Space and Society)
  - 01. 산업화와 도시화에 따른 변화
  - 02. 교통·통신 및 과학기술의 발달에 따른 변화
  - 03. 우리 지역의 공간 변화

### 통합사회 2 (Integrated Social Studies 2)
- **I. 인권 보장과 헌법** (Human Rights Protection and Constitution)
  - 01. 인권의 의미와 현대 사회의 인권
  - 02. 인권 보장을 위한 헌법의 역할과 시민 참여
  - 03. 인권 문제의 양상과 해결 방안
- **II. 사회정의와 불평등** (Social Justice and Inequality)
  - 01. 정의의 의미와 실질적 기준
  - 02. 다양한 정의관의 특징과 적용
  - 03. 다양한 불평등 현상과 정의로운 사회 실현
- **III. 시장경제와 지속가능발전** (Market Economy and Sustainable Development)
  - 01. 자본주의의 전개 과정과 경제 체제
  - 02. 합리적 선택과 경제 주체의 역할
  - 03. 자산 관리와 금융 생활 설계
  - 04. 국제 분업과 무역
- **IV. 세계화와 평화** (Globalization and Peace)
  - 01. 세계화의 다양한 양상과 문제 해결 방안
  - 02. 평화의 의미와 국제 사회의 역할
  - 03. 남북 분단 및 동아시아 역사 갈등과 세계 평화를 위한 노력
- **V. 미래와 지속가능한 삶** (Future and Sustainable Life)
  - 01. 세계의 인구 변화와 인구 문제
  - 02. 에너지 자원과 지속가능한 발전
  - 03. 미래 사회와 세계시민으로서의 삶

## Verification

After running either script, you can verify the insertion by running:

### For Improved Version (with chapter_number):
```sql
SELECT 
    c.id,
    CASE 
        WHEN c.parent_id IS NULL THEN 
            CASE 
                WHEN c.chapter_number = 1 THEN 'I'
                WHEN c.chapter_number = 2 THEN 'II'
                WHEN c.chapter_number = 3 THEN 'III'
                WHEN c.chapter_number = 4 THEN 'IV'
                WHEN c.chapter_number = 5 THEN 'V'
            END || '. ' || c.name
        ELSE 
            LPAD(c.chapter_number::text, 2, '0') || '. ' || c.name
    END as formatted_name,
    c.chapter_number,
    s.name as subject_name
FROM chapters c
JOIN subjects s ON c.subject_id = s.id
ORDER BY s.name, c.chapter_number, c.parent_id, c.chapter_number;
```

### For Original Version:
```sql
SELECT 
    c.id,
    c.name,
    c.parent_id,
    s.name as subject_name,
    CASE 
        WHEN c.parent_id IS NULL THEN 'Main Unit'
        ELSE 'Sub-chapter'
    END as chapter_type
FROM chapters c
JOIN subjects s ON c.subject_id = s.id
ORDER BY s.name, c.name;
```

This should return 30 total chapters:
- 10 main units (5 per textbook)
- 20 sub-chapters (10 per textbook)

## Frontend Integration

### For Improved Version:
```typescript
// API response will include chapter_number
interface Chapter {
  id: string;
  name: string;
  chapter_number: number;
  parent_id?: string;
  subject_id: string;
}

// Format display name
const formatChapterName = (chapter: Chapter, isMainUnit: boolean) => {
  if (isMainUnit) {
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V'];
    return `${romanNumerals[chapter.chapter_number - 1]}. ${chapter.name}`;
  }
  return `${chapter.chapter_number.toString().padStart(2, '0')}. ${chapter.name}`;
};
```

### For Original Version:
```typescript
// Names already include numbers
const chapterName = chapter.name; // "01. 인간, 사회, 환경을 바라보는 다양한 관점"
```

## Recommendations

### ✅ **Use Improved Version** (with chapter_number)
**Advantages:**
- Better data structure
- Easier sorting and filtering
- Consistent ordering across applications
- Simpler reordering if needed
- Better for analytics and reporting

### ❌ **Avoid Original Version** (numbers in names)
**Disadvantages:**
- Requires parsing to extract numbers
- Harder to reorder chapters
- Inconsistent data structure
- More complex frontend logic

## Notes

- The scripts assume that the subjects "통합사회 1" and "통합사회 2" already exist in the `subjects` table
- The chapter structure matches the `contentTree` defined in `lib/global.ts`
- Each chapter has a unique name within its subject
- The hierarchical structure is maintained through the `parent_id` field
- The improved version provides better data integrity and flexibility
