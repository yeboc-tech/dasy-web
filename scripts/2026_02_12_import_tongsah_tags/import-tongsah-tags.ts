/**
 * 통합사회 단원 태그 데이터를 problem_tags에 upsert하는 스크립트
 *
 * Usage: npx tsx scripts/2026_02_12_import_tongsah_tags/import-tongsah-tags.ts [파일명.txt]
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// --- Config ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Subject abbreviation → full subject name (for problem_id)
const SUBJECT_MAP: Record<string, string> = {
  '경제': '경제',
  '사문': '사회문화',
  '윤사': '윤리와사상',
  '정법': '정치와법',
  '한지': '한국지리',
  '세지': '세계지리',
  '생윤': '생활과윤리',
};

// Grade + month → exam type (default, without date correction)
function getExamType(grade: string, month: number): string {
  if (grade === '고3') {
    if (month === 6 || month === 9) return '모평';
    if (month === 11) return '수능';
    return '학평';
  }
  // 고1, 고2: always 학평
  return '학평';
}

// Load exam date correction map from JSON
// Maps "{year}_{grade}_{txt_month}" → { month: system_month, examType: system_exam_type }
interface DateCorrection {
  month: string; // padded, e.g. "10"
  examType: string; // e.g. "학평"
}

function loadDateCorrections(): Map<string, DateCorrection> {
  const corrections = new Map<string, DateCorrection>();
  const files = [
    { path: 'input/exam_actual_dates_고2.json', grade: '고2' },
  ];

  for (const f of files) {
    const filePath = path.join(__dirname, f.path);
    if (!fs.existsSync(filePath)) continue;

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Array<{
      system_partial_id: string;
      ebs_id: string;
      actual_date: string | null;
    }>;

    for (const entry of data) {
      // system_partial_id: "2023_10_학평" → system month=10, type=학평
      const sysParts = entry.system_partial_id.split('_');
      const sysYear = sysParts[0];
      const sysMonth = sysParts[1];
      const sysExamType = sysParts[2];

      // ebs_id: "2023_11_학평" → txt month=11
      const ebsParts = entry.ebs_id.split('_');
      const ebsMonth = ebsParts[1];

      // Only add correction if months differ
      if (sysMonth !== ebsMonth) {
        const key = `${sysYear}_${f.grade}_${ebsMonth}`;
        corrections.set(key, { month: sysMonth, examType: sysExamType });
      }
    }
  }

  return corrections;
}

const dateCorrections = loadDateCorrections();

interface ChapterInfo {
  id: string;
  title: string;
  chapters?: ChapterInfo[];
}

interface SsotData {
  chapters: ChapterInfo[];
}

// Build lookup: chapterId → [parentLabel, childLabel]
function buildLabelLookup(chapters: ChapterInfo[]): Map<string, string[]> {
  const lookup = new Map<string, string[]>();
  for (const parent of chapters) {
    lookup.set(parent.id, [parent.title]);
    if (parent.chapters) {
      for (const child of parent.chapters) {
        lookup.set(child.id, [parent.title, child.title]);
      }
    }
  }
  return lookup;
}

interface ParsedRow {
  problem_id: string;
  type: string;
  tag_ids: string[];
  tag_labels: string[];
}

// Filename (without .txt) → full subject name
const FILENAME_SUBJECT_MAP: Record<string, string> = {
  '경제': '경제',
  '사회문화': '사회문화',
  '윤리와사상': '윤리와사상',
  '정치와법': '정치와법',
  '한국지리': '한국지리',
  '세계지리': '세계지리',
  '생활과윤리': '생활과윤리',
};

function parseLine(line: string, fileSubject: string | null): ParsedRow[] | null {
  // Trim and skip empty lines
  line = line.trim();
  if (!line) return null;

  // Pattern 1: with subject abbreviation (supports comma-separated numbers like "4번, 5번")
  // {year}년[도]? {grade} {month}월 {subject_abbr} {numbers}번/반 [{volume}권] {chapter_tag}
  const regex1 = /^(\d{2,4})년도?\s+(고[123])\s+(\d{1,2})월\s+(\S+)\s+([\d번반,\s]+[번반])\s+(?:(\d)권\s+)?(\d+-\d+)\s*$/;
  // Pattern 2: without subject abbreviation (infer from filename)
  // {year}년[도]? {grade} {month}월 {numbers}번/반 [{volume}권] {chapter_tag}
  const regex2 = /^(\d{2,4})년도?\s+(고[123])\s+(\d{1,2})월\s+([\d번반,\s]+[번반])\s+(?:(\d)권\s+)?(\d+-\d+)\s*$/;

  let yearStr: string, grade: string, monthStr: string, subjectAbbr: string | null, numbersStr: string, volumeStr: string | undefined, chapterTag: string;

  const match1 = line.match(regex1);
  const match2 = line.match(regex2);

  if (match1) {
    [, yearStr, grade, monthStr, subjectAbbr, numbersStr, volumeStr, chapterTag] = match1;
  } else if (match2 && fileSubject) {
    [, yearStr, grade, monthStr, numbersStr, volumeStr, chapterTag] = match2;
    subjectAbbr = null; // will use fileSubject
  } else {
    console.warn(`  [SKIP] Cannot parse: "${line}"`);
    return null;
  }

  // Extract all numbers from "4번, 5번" or "4번" or "8반" (typo)
  const numbers = [...numbersStr.matchAll(/(\d+)[번반]/g)].map(m => parseInt(m[1]));

  // Handle 2-digit years (22 → 2022)
  let year = parseInt(yearStr);
  if (year < 100) year += 2000;
  const month = parseInt(monthStr);
  const volume = volumeStr ? parseInt(volumeStr) : null;

  // Resolve full subject name
  let subjectFull: string | undefined;
  if (subjectAbbr) {
    subjectFull = SUBJECT_MAP[subjectAbbr];
    if (!subjectFull) {
      console.warn(`  [SKIP] Unknown subject abbreviation: "${subjectAbbr}" in "${line}"`);
      return null;
    }
  } else {
    subjectFull = fileSubject!;
  }

  const txtMonthPadded = String(month).padStart(2, '0');

  // Check date correction: txt의 시행일 → system의 실제 시험월/유형
  const correctionKey = `${year}_${grade}_${txtMonthPadded}`;
  const correction = dateCorrections.get(correctionKey);

  const monthPadded = correction ? correction.month : txtMonthPadded;
  const examType = correction ? correction.examType : getExamType(grade, month);

  const type = volume === 2 ? '단원_자세한통합사회_2' : '단원_자세한통합사회_1';
  const parentId = chapterTag.split('-')[0];
  const tag_ids = [parentId, chapterTag];

  // Return one row per problem number
  return numbers.map(number => ({
    problem_id: `${subjectFull}_${grade}_${year}_${monthPadded}_${examType}_${number}_문제`,
    type,
    tag_ids,
    tag_labels: [] as string[],
  }));
}

async function main() {
  console.log('=== 통합사회 단원 태그 Import ===\n');

  // 1. Fetch ssot data
  console.log('Fetching ssot data...');
  const { data: ssotRows, error: ssotError } = await supabase
    .from('ssot')
    .select('key, value')
    .in('key', ['단원_자세한통합사회_1', '단원_자세한통합사회_2']);

  if (ssotError || !ssotRows) {
    console.error('Failed to fetch ssot:', ssotError);
    process.exit(1);
  }

  const labelLookups: Record<string, Map<string, string[]>> = {};
  for (const row of ssotRows) {
    const data = row.value as SsotData;
    labelLookups[row.key] = buildLabelLookup(data.chapters);
  }
  console.log(`  Loaded ssot keys: ${ssotRows.map(r => r.key).join(', ')}\n`);

  // 2. Read and parse all input files
  const inputDir = path.join(__dirname, 'input');
  const filterFile = process.argv[2]; // optional: pass a filename to process only that file
  const allFiles = fs.readdirSync(inputDir).filter(f => f.endsWith('.txt'));
  const files = filterFile ? allFiles.filter(f => f === filterFile) : allFiles;

  let totalLines = 0;
  let parsedRows: ParsedRow[] = 0 as any;
  parsedRows = [];
  let skipCount = 0;
  let emptyLines = 0;

  for (const file of files) {
    const filePath = path.join(inputDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Infer subject from filename (e.g., "사회문화.txt" → "사회문화")
    const fileBaseName = file.replace('.txt', '');
    const fileSubject = FILENAME_SUBJECT_MAP[fileBaseName] || null;

    console.log(`Processing ${file} (${lines.length} lines, subject fallback: ${fileSubject || 'none'})...`);
    let fileCount = 0;

    for (const line of lines) {
      if (!line.trim()) {
        emptyLines++;
        continue;
      }
      totalLines++;

      const parsedList = parseLine(line, fileSubject);
      if (!parsedList) {
        skipCount++;
        continue;
      }

      for (const parsed of parsedList) {
        // Resolve tag_labels
        const lookup = labelLookups[parsed.type];
        if (!lookup) {
          console.warn(`  [SKIP] No ssot data for type: ${parsed.type}`);
          skipCount++;
          continue;
        }

        const labels = lookup.get(parsed.tag_ids[1]); // Look up by child id (e.g., "3-1")
        if (!labels) {
          console.warn(`  [SKIP] No label found for tag ${parsed.tag_ids[1]} in ${parsed.type} (problem: ${parsed.problem_id})`);
          skipCount++;
          continue;
        }

        parsed.tag_labels = labels;
        parsedRows.push(parsed);
        fileCount++;
      }
    }
    console.log(`  → ${fileCount} rows parsed`);
  }

  console.log(`\n--- Parse Summary ---`);
  console.log(`Total data lines: ${totalLines}`);
  console.log(`Empty lines skipped: ${emptyLines}`);
  console.log(`Parse failures: ${skipCount}`);
  console.log(`Successfully parsed: ${parsedRows.length}`);

  // 3. Check for duplicates
  const seen = new Map<string, number>();
  let duplicateCount = 0;
  for (const row of parsedRows) {
    const key = `${row.problem_id}|${row.type}`;
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  const duplicateKeys = [...seen.entries()].filter(([, count]) => count > 1);
  if (duplicateKeys.length > 0) {
    duplicateCount = duplicateKeys.reduce((sum, [, count]) => sum + (count - 1), 0);
    console.log(`Duplicate entries (same problem_id+type): ${duplicateCount}`);
    duplicateKeys.slice(0, 5).forEach(([key, count]) => {
      console.log(`  ${key}: ${count} times`);
    });
  }

  // Deduplicate (keep last occurrence)
  const deduped = new Map<string, ParsedRow>();
  for (const row of parsedRows) {
    const key = `${row.problem_id}|${row.type}`;
    deduped.set(key, row);
  }
  const uniqueRows = [...deduped.values()];
  console.log(`Unique rows to upsert: ${uniqueRows.length}\n`);

  // 4. Upsert in batches
  const BATCH_SIZE = 200;
  let successCount = 0;
  let failCount = 0;
  const CREATED_AT = '2026-02-12T00:00:00+00:00';

  for (let i = 0; i < uniqueRows.length; i += BATCH_SIZE) {
    const batch = uniqueRows.slice(i, i + BATCH_SIZE);
    const records = batch.map(row => ({
      problem_id: row.problem_id,
      type: row.type,
      tag_ids: row.tag_ids,
      tag_labels: row.tag_labels,
      created_at: CREATED_AT,
      updated_at: CREATED_AT,
    }));

    const { error } = await supabase
      .from('problem_tags')
      .upsert(records, { onConflict: 'problem_id,type' });

    if (error) {
      console.error(`  Batch ${Math.floor(i / BATCH_SIZE) + 1} FAILED:`, error.message);
      failCount += batch.length;
    } else {
      successCount += batch.length;
      process.stdout.write(`  Upserted ${Math.min(i + BATCH_SIZE, uniqueRows.length)}/${uniqueRows.length}\r`);
    }
  }

  console.log(`\n\n=== Final Result ===`);
  console.log(`Total data lines in files: ${totalLines}`);
  console.log(`Parse failures/skipped: ${skipCount}`);
  console.log(`Duplicates removed: ${duplicateCount}`);
  console.log(`Upsert success: ${successCount}`);
  console.log(`Upsert failed: ${failCount}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
