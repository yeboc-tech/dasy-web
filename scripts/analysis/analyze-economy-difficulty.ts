/**
 * Script to analyze the relationship between correct_rate and difficulty for economy problems
 *
 * This helps determine if we should calculate difficulty from correct_rate for economy problems
 * or keep using the database difficulty field.
 *
 * Run with: npx tsx scripts/analyze-economy-difficulty.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Difficulty calculation function (same as in difficultyCorrectRateSync.ts)
function getCalculatedDifficulty(correctRate: number): '상' | '중' | '하' {
  if (correctRate < 40) return '상';
  if (correctRate < 70) return '중';
  return '하';
}

interface EconomyProblem {
  problem_id: string;
  difficulty: string | null;
  accuracy_rate: number | null;
}

async function analyzeEconomyDifficulty() {
  console.log('🔍 Analyzing economy problem difficulty vs correct_rate...\n');

  // Fetch all economy problems from accuracy_rate table
  // Economy problems have problem_id pattern: 경제_고3_YYYY_MM_시험종류_번호_문제
  const { data: problems, error } = await supabase
    .from('accuracy_rate')
    .select('problem_id, difficulty, accuracy_rate')
    .like('problem_id', '경제_%');

  if (error) {
    console.error('❌ Error fetching economy problems:', error);
    process.exit(1);
  }

  if (!problems || problems.length === 0) {
    console.log('⚠️  No economy problems found in database');
    process.exit(0);
  }

  console.log(`📊 Total economy problems: ${problems.length}\n`);

  // Statistics
  const stats = {
    total: problems.length,
    withDifficulty: 0,
    withCorrectRate: 0,
    withBoth: 0,
    matches: 0,
    mismatches: 0,
    byDbDifficulty: { '상': 0, '중': 0, '하': 0, null: 0 } as Record<string, number>,
    byCalculatedDifficulty: { '상': 0, '중': 0, '하': 0, 'N/A': 0 } as Record<string, number>,
    correctRateByDbDifficulty: { '상': [] as number[], '중': [] as number[], '하': [] as number[] } as Record<string, number[]>
  };

  const mismatches: Array<{
    problem_id: string;
    db_difficulty: string | null;
    correct_rate: number;
    calculated_difficulty: string;
  }> = [];

  // Analyze each problem
  for (const problem of problems as EconomyProblem[]) {
    const dbDifficulty = problem.difficulty;
    const correctRate = problem.accuracy_rate;

    // Count problems with difficulty/correct_rate
    if (dbDifficulty) stats.withDifficulty++;
    if (correctRate !== null && correctRate !== undefined) stats.withCorrectRate++;
    if (dbDifficulty && correctRate !== null && correctRate !== undefined) stats.withBoth++;

    // Count by DB difficulty
    const dbDiffKey = dbDifficulty || 'null';
    stats.byDbDifficulty[dbDiffKey] = (stats.byDbDifficulty[dbDiffKey] || 0) + 1;

    // Store correct rates by DB difficulty for averaging
    if (dbDifficulty && correctRate !== null && correctRate !== undefined) {
      // Only store if it's one of our expected difficulty levels
      if (dbDifficulty === '상' || dbDifficulty === '중' || dbDifficulty === '하') {
        stats.correctRateByDbDifficulty[dbDifficulty].push(correctRate);
      }
    }

    // Calculate what difficulty would be based on correct_rate
    if (correctRate !== null && correctRate !== undefined) {
      const calculatedDifficulty = getCalculatedDifficulty(correctRate);
      stats.byCalculatedDifficulty[calculatedDifficulty]++;

      // Compare DB difficulty with calculated difficulty
      if (dbDifficulty) {
        if (dbDifficulty === calculatedDifficulty) {
          stats.matches++;
        } else {
          stats.mismatches++;
          mismatches.push({
            problem_id: problem.problem_id,
            db_difficulty: dbDifficulty,
            correct_rate: correctRate,
            calculated_difficulty: calculatedDifficulty
          });
        }
      }
    } else {
      stats.byCalculatedDifficulty['N/A']++;
    }
  }

  // Print results
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📈 DISTRIBUTION BY DB DIFFICULTY');
  console.log('═══════════════════════════════════════════════════════════');
  Object.entries(stats.byDbDifficulty).forEach(([diff, count]) => {
    const percentage = ((count / stats.total) * 100).toFixed(1);
    console.log(`${diff.padEnd(8)}: ${count.toString().padStart(4)} (${percentage}%)`);
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📈 DISTRIBUTION BY CALCULATED DIFFICULTY (from correct_rate)');
  console.log('═══════════════════════════════════════════════════════════');
  Object.entries(stats.byCalculatedDifficulty).forEach(([diff, count]) => {
    const percentage = ((count / stats.total) * 100).toFixed(1);
    console.log(`${diff.padEnd(8)}: ${count.toString().padStart(4)} (${percentage}%)`);
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 AVERAGE CORRECT_RATE BY DB DIFFICULTY');
  console.log('═══════════════════════════════════════════════════════════');
  (['상', '중', '하'] as const).forEach(diff => {
    const rates = stats.correctRateByDbDifficulty[diff];
    if (rates.length > 0) {
      const avg = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
      const min = Math.min(...rates);
      const max = Math.max(...rates);
      console.log(`${diff}: Avg ${avg.toFixed(1)}%  (Min: ${min}%, Max: ${max}%)`);
    } else {
      console.log(`${diff}: No data`);
    }
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🎯 MATCH ANALYSIS (for problems with both fields)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Problems with both difficulty & correct_rate: ${stats.withBoth}`);
  console.log(`Matches (DB === Calculated):                   ${stats.matches} (${((stats.matches / stats.withBoth) * 100).toFixed(1)}%)`);
  console.log(`Mismatches (DB !== Calculated):                ${stats.mismatches} (${((stats.mismatches / stats.withBoth) * 100).toFixed(1)}%)`);

  // Show sample mismatches
  if (mismatches.length > 0) {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`⚠️  SAMPLE MISMATCHES (showing first 10 of ${mismatches.length})`);
    console.log('═══════════════════════════════════════════════════════════');
    mismatches.slice(0, 10).forEach(m => {
      console.log(`${m.problem_id}`);
      console.log(`  DB: ${m.db_difficulty}  |  Correct Rate: ${m.correct_rate}%  |  Calculated: ${m.calculated_difficulty}`);
      console.log('');
    });
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('💡 RECOMMENDATION');
  console.log('═══════════════════════════════════════════════════════════');

  const matchPercentage = (stats.matches / stats.withBoth) * 100;

  if (matchPercentage >= 80) {
    console.log('✅ HIGH MATCH RATE (≥80%)');
    console.log('   → Consider using calculated difficulty for economy problems');
  } else if (matchPercentage >= 60) {
    console.log('⚠️  MODERATE MATCH RATE (60-80%)');
    console.log('   → Review mismatches to decide');
  } else {
    console.log('❌ LOW MATCH RATE (<60%)');
    console.log('   → Keep using DB difficulty for economy problems');
  }

  console.log('\n');
}

analyzeEconomyDifficulty().catch(console.error);
