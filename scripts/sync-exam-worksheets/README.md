# 시험-워크시트 동기화 스크립트

시험 데이터(exams.json)를 기반으로 비공개 워크시트를 생성하고, worksheet_id를 연결합니다.

## 실행 방법

```bash
npx tsx scripts/sync-exam-worksheets
```

## 동작 과정

1. `data/exams.json`에서 시험 목록 로드
2. 각 시험에 대해:
   - `worksheet_id`가 이미 있으면 스킵
   - `accuracy_rate` 테이블에서 해당 시험의 문제 ID 조회
   - 문제가 있으면 비공개 워크시트 생성
   - `exams.json`에 `worksheet_id` 추가
3. 결과 저장

## 입출력

### 입력
- **파일**: `data/exams.json`

### 출력
- **파일 업데이트**: `data/exams.json` (worksheet_id 추가)
- **DB 생성**: `worksheets` 테이블에 비공개 워크시트 생성
- **로그**: `output/sync-log.json`

## 워크시트 생성 규칙

| 필드 | 값 |
|------|-----|
| `title` | 시험명 + 과목 (예: "2025학년도 대학수학능력시험 경제") |
| `author` | "키다리" |
| `is_public` | `false` (비공개) |
| `created_by` | `null` |
| `filters.source` | "exam" |
| `filters.exam_id` | 시험 ID |

## 시험명 형식

| 시험 유형 | 형식 | 예시 |
|----------|------|------|
| 수능 | `{year}학년도 대학수학능력시험 {subject}` | 2025학년도 대학수학능력시험 경제 |
| 모평 | `{year}학년도 {month}월 모의평가 {subject}` | 2025학년도 9월 모의평가 경제 |
| 학평 | `{year}년 {month}월 {grade} 학력평가 {subject}` | 2025년 10월 고3 학력평가 경제 |

## 로그 구조

```json
{
  "syncedAt": "2026-02-09T00:00:00.000Z",
  "created": 972,
  "skipped": 1200,
  "alreadyExists": 0,
  "failed": 0,
  "details": {
    "created": ["경제_고3_2025_11_수능_NA", ...],
    "skipped": ["경제_고3_2006_03_학평_인천", ...],
    "failed": []
  }
}
```

## 주의사항

- 이미 `worksheet_id`가 있는 시험은 스킵됩니다 (중복 생성 방지)
- 문제 데이터가 없는 오래된 시험은 스킵됩니다
- API 속도 제한을 위해 각 요청 사이에 50ms 딜레이가 있습니다
