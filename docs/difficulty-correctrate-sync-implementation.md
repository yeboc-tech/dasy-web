# Difficulty and Correct Rate Synchronization for 통합사회

## Overview
Implemented bidirectional synchronization between difficulty (난이도) and correct rate (정답률) filters for 통합사회 problems. Difficulty is now dynamically calculated from correct_rate instead of using the database field.

## Difficulty Mapping
- **상 (Hard)**: 0-40% correct rate
- **중 (Medium)**: 40-70% correct rate
- **하 (Easy)**: 70-100% correct rate

## Changes Made

### 1. Core Utility Functions (`lib/utils/difficultyCorrectRateSync.ts`)
Created utility functions for:
- `getDifficultyFromCorrectRate()` - Calculate difficulty from correct rate
- `getCorrectRateRangeFromDifficulties()` - Convert difficulty selections to correct rate range
- `getDifficultiesFromCorrectRateRange()` - Convert correct rate range to difficulty selections
- Helper functions to check sync state and avoid infinite loops

### 2. Filter Synchronization (`components/build/filters/TonghapsahoeFilters.tsx`)
Added bidirectional sync:
- When user adjusts **correct rate slider** → automatically updates **difficulty checkboxes**
- When user selects **difficulty checkboxes** → automatically adjusts **correct rate slider**
- Uses ref tracking to prevent infinite update loops

### 3. Problem Filtering (`lib/utils/problemFiltering.ts`)
- Updated to use unified `getDifficultyFromCorrectRate()` function
- Filters problems based on calculated difficulty from correct_rate
- Ensures consistency across the app

### 4. Problem Display (`components/build/problemsPanel.tsx`)
- Changed difficulty badge to display calculated difficulty from `correct_rate`
- Shows difficulty dynamically instead of using DB field
- Only applies to 통합사회 problems

### 5. Economy Problems (Not Changed)
`components/build/EconomyProblemsPanel.tsx` continues to use database difficulty field since this requirement is specifically for 통합사회.

## How It Works

### User Interaction Flow

**Scenario 1: User adjusts correct rate slider**
1. User moves slider to [20, 60]
2. System calculates overlapping difficulties: 상 (0-40) + 중 (40-70)
3. Difficulty checkboxes automatically update to show: ☑ 상, ☑ 중, ☐ 하

**Scenario 2: User selects difficulties**
1. User checks only '상' difficulty
2. System calculates corresponding range: [0, 40]
3. Correct rate slider automatically adjusts to 0-40%

**Scenario 3: User selects non-contiguous difficulties**
1. User checks '상' and '하' (but not '중')
2. System calculates minimum encompassing range: [0, 100]
3. Correct rate slider adjusts to full range (since slider can't show discontinuous ranges)
4. All difficulties remain selected

## Benefits
1. **Consistency**: Difficulty is always derived from correct_rate data
2. **User Experience**: Filters stay in sync automatically
3. **Data Integrity**: Single source of truth (correct_rate) for difficulty
4. **Flexibility**: Easy to adjust difficulty thresholds in one place

## Technical Implementation Details

### Avoiding Infinite Loops
Uses `updateSourceRef` to track the origin of changes:
- When correct rate changes → set ref to 'correctRate' before updating difficulties
- When difficulty changes → set ref to 'difficulty' before updating correct rate
- Each useEffect checks the ref and skips if change came from the other filter

### Sync Validation
Before updating, checks if values are already in sync using:
- `doesCorrectRateMatchDifficulties()` - Checks if correct rate exactly matches difficulty selections
- `doDifficultiesMatchCorrectRate()` - Checks if difficulties exactly match correct rate range

This prevents unnecessary updates and maintains smooth UX.

## Future Considerations
- If economy (경제) needs similar functionality, the same utility functions can be reused
- Difficulty ranges can be easily adjusted in `difficultyCorrectRateSync.ts`
- Additional difficulty levels can be added if needed
