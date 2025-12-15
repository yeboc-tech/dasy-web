# Solve Feature Implementation Plan

> Created: 2024-12-13
> Last Updated: 2024-12-13
> Scope: Tagged subjects only (경제, 사회문화, 생활과윤리)

---

## Overview

Implement a complete test-taking and progress tracking system for KIDARI:
1. **Drag & Drop Sorting** - Manual problem reordering in worksheet preview
2. **Solve & Save** - Take tests and save results to database
3. **Score Result Dialog** - Show results after grading
4. **내 학습지 Upgrade** - Add 풀이 column and tabs for created/solved worksheets
5. **오답 Toggle** - Create worksheets from wrong problems

---

## Progress Summary

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Database (`solves` table) | ✅ Complete |
| 1 | `solveService.ts` | ✅ Complete |
| 1 | Solve view mode in WorksheetBuilder | ✅ Complete |
| 1 | Auth requirement for solve | ✅ Complete |
| 2 | Score result dialog | ✅ Complete |
| 2 | OMR card styling (pink theme) | ✅ Complete |
| 3 | 내 학습지 tabs (내가 만든/내가 푼) | ⏳ Pending |
| 3 | 풀이 column with dialog | ⏳ Pending |
| 4 | 오답 toggle in 문제 추가 | ⏳ Pending |
| 5 | Drag & drop sorting (수동 정렬) | ⏳ Pending |

---

## Database Schema

### Table: `solves` ✅ Created

```sql
CREATE TABLE solves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worksheet_id uuid NOT NULL REFERENCES worksheets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  score integer NOT NULL,          -- Points earned (e.g., 45)
  max_score integer NOT NULL,      -- Total possible points (e.g., 50)
  correct_count integer NOT NULL,  -- Number correct (e.g., 17)
  total_problems integer NOT NULL, -- Total problems (e.g., 20)

  results jsonb NOT NULL,          -- Per-problem details

  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_solves_user_id ON solves(user_id);
CREATE INDEX idx_solves_worksheet_id ON solves(worksheet_id);
CREATE INDEX idx_solves_created_at ON solves(created_at DESC);

-- RLS Policies
ALTER TABLE solves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own solves" ON solves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own solves" ON solves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own solves" ON solves FOR DELETE USING (auth.uid() = user_id);
```

### `results` JSONB Structure

```json
{
  "경제_고3_2024_03_학평_1_문제": {
    "user_answer": 3,
    "correct_answer": 4,
    "is_correct": false,
    "score": 2
  },
  "경제_고3_2024_03_학평_2_문제": {
    "user_answer": 1,
    "correct_answer": 1,
    "is_correct": true,
    "score": 3
  }
}
```

---

## Completed Features

### Phase 1 & 2: Solve Mode ✅

**Files Created/Modified:**
- `lib/supabase/services/solveService.ts` - New service with:
  - `saveSolve()` - Save solve records
  - `getSolvesByWorksheet()` - Get solves for a worksheet
  - `getSolvesByUser()` - Get all user's solves
  - `getWrongProblemIds()` - Get wrong problem IDs for 오답 feature
  - `getSolveCountByWorksheet()` - Count solves
  - `getSolvedWorksheets()` - Get worksheets user solved (for 내가 푼 tab)
  - `deleteSolve()` - Delete a solve record

- `components/worksheet/WorksheetBuilder.tsx` - Added:
  - `'solve'` view mode
  - 풀기 button in PDF view (tagged subjects only, auth required)
  - Solve view with OMR left, PDF right
  - Pre-generated solve PDF (no re-render when entering solve mode)
  - Auto-grading with `accuracy_rate` table
  - Saves results to `solves` table
  - Score result dialog after grading
  - Buttons: 자동 채점 (white), 저장 (pink CTA)

- `components/solve/OMRSheet.tsx` - Restyled:
  - Pink theme (border, header bg, selected state)
  - Consistent spacing (12px padding = gap)
  - Thin ovals (14px width, 1:2 aspect ratio)
  - Gray border matching PDF page style
  - Removed 자동 채점 button (moved to top bar)

- `components/solve/SimplePDFViewer.tsx` - Fixed:
  - Added `loadedUrlRef` to prevent re-loading on tab switch

**UI Flow:**
1. User generates PDF → clicks 풀기 button
2. View transitions to solve mode (OMR left + PDF right)
3. User selects answers on OMR card
4. Clicks 자동 채점 or 저장 → grades, saves to DB, shows result dialog
5. Can click 다시 풀기 to reset

---

## Remaining Features

### Phase 3: 내 학습지 Page Upgrade

**Goal:** Add tabs for "내가 만든" and "내가 푼" worksheets, plus 풀이 column with dialog.

**UI Design:**
```
┌─────────────────────────────────────────────────┐
│  내 학습지                                        │
│                                                 │
│  [내가 만든]  [내가 푼]                            │
│  ─────────────────────────────────────────────  │
│                                                 │
│  | 제목 | 문제수 | 생성일 | 풀이 | 작업 |          │
│  |------|-------|-------|-----|-----|          │
│  | 경제 | 20    | 12.10 | [3회]| ... |          │
│                                                 │
└─────────────────────────────────────────────────┘
```

**풀이 Dialog:**
```
┌──────────────────────────────────────────┐
│  경제 1단원 풀이 기록                       │
├──────────────────────────────────────────┤
│  #  │  점수      │  정답률  │  날짜        │
│  1  │  45/50    │  17/20  │  12.13 14:30 │
│  2  │  42/50    │  16/20  │  12.12 10:15 │
├──────────────────────────────────────────┤
│                              [닫기]       │
└──────────────────────────────────────────┘
```

**Implementation:**
1. Add tabs to `app/(app)/my-worksheets/page.tsx`
   - Tab 1: 내가 만든 - `worksheets WHERE created_by = user_id`
   - Tab 2: 내가 푼 - `solves WHERE user_id = ? JOIN worksheets` (excluding own)
2. Add 풀이 column to worksheet table
3. Create `components/worksheets/SolvesDialog.tsx`

---

### Phase 4: 오답 Toggle in 문제 추가

**Goal:** Add toggle in 문제 추가 view to show problems user got wrong.

**Implementation:**
1. Create `lib/hooks/useWrongProblems.ts`
   - Uses `getWrongProblemIds()` from solveService
   - Fetches full problem data for wrong problems
2. Add 오답 toggle to `components/build/filterPanel.tsx`
   - Toggle at top of filter panel
   - When enabled, replace problem pool with wrong problems
3. Integrate with WorksheetBuilder
   - When 오답 toggle on, load wrong problems into `addProblemsPool`

---

### Phase 5: Drag & Drop Sorting (수동 정렬)

**Goal:** Allow users to manually reorder problems in worksheet preview using drag and drop.

**Implementation:**
1. Add `"수동"` to `SortingPreset` type in `lib/types/sorting.ts`
2. Add "수동 정렬" option to dropdown in `WorksheetMetadataPanel.tsx`
3. Add drag & drop using `@dnd-kit` (already installed) to:
   - `components/build/problemsPanel.tsx`
   - `components/build/TaggedProblemsPanel.tsx`
4. Update WorksheetBuilder to handle manual ordering
   - Skip `sortAndSetProblems()` when sorting is "수동"

---

## Files Summary

### Completed Files
- ✅ `lib/supabase/services/solveService.ts` (new)
- ✅ `components/solve/OMRSheet.tsx` (modified)
- ✅ `components/solve/SimplePDFViewer.tsx` (modified)
- ✅ `components/worksheet/WorksheetBuilder.tsx` (modified)
- ✅ `app/(app)/w/[id]/solve/page.tsx` (modified - legacy page updated)

### Pending Files
- ⏳ `app/(app)/my-worksheets/page.tsx` (modify for tabs)
- ⏳ `components/worksheets/SolvesDialog.tsx` (new)
- ⏳ `lib/hooks/useWrongProblems.ts` (new)
- ⏳ `components/build/filterPanel.tsx` (modify for 오답 toggle)
- ⏳ `lib/types/sorting.ts` (modify for 수동)
- ⏳ `components/build/WorksheetMetadataPanel.tsx` (modify for 수동 정렬)
- ⏳ `components/build/problemsPanel.tsx` (modify for drag & drop)
- ⏳ `components/build/TaggedProblemsPanel.tsx` (modify for drag & drop)

---

## Notes

- Score = sum of problem points (2 or 3 from `accuracy_rate.score`)
- Solve PDF is pre-generated when main PDF is generated (no delay when clicking 풀기)
- Legacy `/w/[id]/solve` page still exists but new solve mode in WorksheetBuilder is preferred
