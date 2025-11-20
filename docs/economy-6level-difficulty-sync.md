# Economy 6-Level Difficulty System with Bidirectional Sync

## Overview
Implemented a 6-level difficulty system for economy problems with bidirectional synchronization between difficulty (난이도) and correct rate (정답률) filters, just like 통합사회 but with more granularity.

## Economy Difficulty Levels (based on correct_rate analysis):

| Level | Correct Rate Range | Count | % of Total |
|-------|-------------------|-------|------------|
| **최상** | 0-29% | 1 | 0.1% |
| **상** | 30-49% | 32 | 3.2% |
| **중상** | 50-59% | 95 | 9.5% |
| **중** | 60-79% | 461 | 46.1% |
| **중하** | 80-89% | 320 | 32.0% |
| **하** | 90-100% | 91 | 9.1% |

**Key Finding:** Zero overlaps between difficulty levels - perfect sequential ranges!

## Changes Made

### 1. Economy Difficulty Sync Utility (`lib/utils/economyDifficultySync.ts`)
Created utility functions specific to economy's 6-level system:
- `getEconomyDifficultyFromCorrectRate()` - Calculate difficulty from correct rate
- `getCorrectRateRangeFromEconomyDifficulties()` - Convert difficulty selections to correct rate range
- `getEconomyDifficultiesFromCorrectRateRange()` - Convert correct rate range to difficulty selections
- Helper functions to check sync state and avoid infinite loops

### 2. Economy Filters Component (`components/build/filters/EconomyFilters.tsx`)
Added bidirectional sync and 6-level UI:
- **6 difficulty buttons**: 최상, 상, 중상, 중, 중하, 하
- When user adjusts **correct rate slider** → automatically updates **difficulty checkboxes**
- When user selects **difficulty checkboxes** → automatically adjusts **correct rate slider**
- Uses ref tracking to prevent infinite update loops

### 3. Zustand Store (`lib/zustand/worksheetStore.ts`)
- Updated default selected difficulties to include all 6 levels: `['최상', '상', '중상', '중', '중하', '하']`
- This supports both 통합사회 (uses 3) and 경제 (uses 6) from the same store

### 4. 통합사회 Filters Update (`components/build/filters/TonghapsahoeFilters.tsx`)
- Updated to filter out economy-specific levels ('최상', '중상', '중하')
- Only shows and interacts with 3 levels: 상, 중, 하
- Compatible with shared store that has 6 levels

### 5. Problem Display (`components/build/EconomyProblemsPanel.tsx`)
- Changed difficulty badge to display calculated difficulty from `correct_rate`
- Uses `getEconomyDifficultyFromCorrectRate()` for consistency
- Shows dynamic difficulty instead of DB field

## How It Works

### User Interaction Flow

**Scenario 1: User adjusts correct rate slider**
1. User moves slider to [40, 70]
2. System calculates overlapping difficulties: 상 (30-49) + 중상 (50-59) + 중 (60-79)
3. Difficulty checkboxes automatically update to show: ☐ 최상, ☑ 상, ☑ 중상, ☑ 중, ☐ 중하, ☐ 하

**Scenario 2: User selects difficulties**
1. User checks only '중상' and '중' difficulties
2. System calculates corresponding range: [50, 79]
3. Correct rate slider automatically adjusts to 50-79%

**Scenario 3: User selects all difficulties**
1. User clicks "모두" button
2. All 6 difficulties get selected
3. Correct rate slider adjusts to full range (0-100%)

## Comparison: 통합사회 vs 경제

| Aspect | 통합사회 | 경제 |
|--------|---------|------|
| Difficulty Levels | 3 (상, 중, 하) | 6 (최상, 상, 중상, 중, 중하, 하) |
| Ranges | 상: 0-40%, 중: 40-70%, 하: 70-100% | See table above |
| Overlaps | None | None |
| Sync | Bidirectional | Bidirectional |
| Data Source | Calculated from correct_rate | Calculated from correct_rate |

## Benefits

1. **Consistency**: Both subjects now calculate difficulty from correct_rate
2. **User Experience**: Filters stay in sync automatically for both modes
3. **Granularity**: Economy gets finer control with 6 levels
4. **Data Integrity**: Single source of truth (correct_rate) for difficulty in both modes
5. **Clean Separation**: No overlaps in difficulty ranges

## Technical Implementation Details

### Avoiding Infinite Loops
Same pattern as 통합사회:
- Uses `updateSourceRef` to track the origin of changes
- Each useEffect checks the ref and skips if change came from the other filter

### Compatibility
- Store holds 6 levels by default
- 통합사회 filter only shows/uses 3 of them
- Economy filter shows/uses all 6
- No conflicts or issues

## Future Considerations

- Both systems now use calculated difficulty
- Easy to adjust ranges if needed (single place: sync utility files)
- Could add more difficulty levels for other subjects in the future
- Admin pages still show raw DB difficulty for data integrity
