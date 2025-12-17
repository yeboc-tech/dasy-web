/**
 * Script to analyze the 5-level difficulty system for economy problems
 * and determine optimal correct_rate ranges for each level
 *
 * Run with: npx tsx scripts/analyze-economy-5level-ranges.ts
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

interface EconomyProblem {
  problem_id: string;
  difficulty: string | null;
  accuracy_rate: number | null;
}

async function analyzeEconomy5LevelRanges() {
  console.log('🔍 Analyzing 5-level difficulty ranges for economy problems...\n');

  // Fetch all economy problems
  const { data: problems, error } = await supabase
    .from('accuracy_rate')
    .select('problem_id, difficulty, accuracy_rate')
    .like('problem_id', '경제_%')
    .not('accuracy_rate', 'is', null)
    .not('difficulty', 'is', null);

  if (error) {
    console.error('❌ Error fetching economy problems:', error);
    process.exit(1);
  }

  if (!problems || problems.length === 0) {
    console.log('⚠️  No economy problems found with both difficulty and accuracy_rate');
    process.exit(0);
  }

  console.log(`📊 Total problems with both fields: ${problems.length}\n`);

  // Group by difficulty and collect statistics
  const difficultyStats: Record<string, {
    count: number;
    rates: number[];
    min: number;
    max: number;
    avg: number;
    median: number;
    percentile25: number;
    percentile75: number;
  }> = {};

  for (const problem of problems as EconomyProblem[]) {
    const diff = problem.difficulty!;
    const rate = problem.accuracy_rate!;

    if (!difficultyStats[diff]) {
      difficultyStats[diff] = {
        count: 0,
        rates: [],
        min: Infinity,
        max: -Infinity,
        avg: 0,
        median: 0,
        percentile25: 0,
        percentile75: 0
      };
    }

    difficultyStats[diff].count++;
    difficultyStats[diff].rates.push(rate);
    difficultyStats[diff].min = Math.min(difficultyStats[diff].min, rate);
    difficultyStats[diff].max = Math.max(difficultyStats[diff].max, rate);
  }

  // Calculate statistics for each difficulty
  for (const diff in difficultyStats) {
    const stats = difficultyStats[diff];
    const rates = stats.rates.sort((a, b) => a - b);

    stats.avg = rates.reduce((sum, r) => sum + r, 0) / rates.length;
    stats.median = rates[Math.floor(rates.length / 2)];
    stats.percentile25 = rates[Math.floor(rates.length * 0.25)];
    stats.percentile75 = rates[Math.floor(rates.length * 0.75)];
  }

  // Sort difficulties by average correct rate (ascending = hardest first)
  const sortedDifficulties = Object.keys(difficultyStats).sort((a, b) =>
    difficultyStats[a].avg - difficultyStats[b].avg
  );

  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 CORRECT_RATE STATISTICS BY DIFFICULTY LEVEL');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('Difficulty | Count |  Min |  P25 | Median |  P75 |  Max |  Avg | Suggested Range');
  console.log('───────────┼───────┼──────┼──────┼────────┼──────┼──────┼──────┼─────────────────');

  for (const diff of sortedDifficulties) {
    const stats = difficultyStats[diff];
    const suggestedMin = Math.floor(stats.percentile25);
    const suggestedMax = Math.ceil(stats.percentile75);

    console.log(
      `${diff.padEnd(10)} | ${stats.count.toString().padStart(5)} | ` +
      `${stats.min.toFixed(0).padStart(4)} | ` +
      `${stats.percentile25.toFixed(0).padStart(4)} | ` +
      `${stats.median.toFixed(0).padStart(6)} | ` +
      `${stats.percentile75.toFixed(0).padStart(4)} | ` +
      `${stats.max.toFixed(0).padStart(4)} | ` +
      `${stats.avg.toFixed(1).padStart(4)} | ` +
      `${suggestedMin}-${suggestedMax}%`
    );
  }

  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // Generate suggested ranges based on quartiles
  console.log('💡 SUGGESTED MAPPING (based on P25-P75 ranges):');
  console.log('═══════════════════════════════════════════════════════════════════════════');

  // Create non-overlapping ranges
  const ranges: Array<{level: string, min: number, max: number}> = [];

  for (let i = 0; i < sortedDifficulties.length; i++) {
    const diff = sortedDifficulties[i];
    const stats = difficultyStats[diff];

    // Use P25 as min, P75 as max
    let min = Math.floor(stats.percentile25);
    let max = Math.ceil(stats.percentile75);

    // Adjust boundaries to avoid gaps/overlaps
    if (i > 0) {
      const prevMax = ranges[i - 1].max;
      if (min <= prevMax) {
        min = prevMax + 1;
      }
    }

    // Ensure max doesn't overlap with next level
    if (i < sortedDifficulties.length - 1) {
      const nextStats = difficultyStats[sortedDifficulties[i + 1]];
      const nextMin = Math.floor(nextStats.percentile25);
      if (max >= nextMin) {
        max = nextMin - 1;
      }
    }

    ranges.push({ level: diff, min, max });
  }

  for (const range of ranges) {
    console.log(`${range.level.padEnd(4)}: ${range.min.toString().padStart(2)}-${range.max.toString().padEnd(2)}%`);
  }

  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // Generate TypeScript code
  console.log('💻 SUGGESTED TYPESCRIPT IMPLEMENTATION:');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`
export const ECONOMY_DIFFICULTY_RANGES = {
${ranges.map(r => `  '${r.level}': { min: ${r.min}, max: ${r.max} }`).join(',\n')}
} as const;

export type EconomyDifficultyLevel = ${sortedDifficulties.map(d => `'${d}'`).join(' | ')};

export function getEconomyDifficultyFromCorrectRate(correctRate: number): EconomyDifficultyLevel {
${ranges.map((r, i) => {
  if (i === 0) {
    return `  if (correctRate < ${r.max}) return '${r.level}';`;
  } else if (i === ranges.length - 1) {
    return `  return '${r.level}'; // ${r.min}% and above`;
  } else {
    return `  if (correctRate < ${r.max}) return '${r.level}';`;
  }
}).join('\n')}
}
`);
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // Distribution visualization
  console.log('📊 DISTRIBUTION VISUALIZATION:');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  const maxCount = Math.max(...Object.values(difficultyStats).map(s => s.count));
  const barWidth = 50;

  for (const diff of sortedDifficulties) {
    const stats = difficultyStats[diff];
    const barLength = Math.round((stats.count / maxCount) * barWidth);
    const bar = '█'.repeat(barLength);
    const percentage = ((stats.count / problems.length) * 100).toFixed(1);

    console.log(`${diff.padEnd(4)} [${bar.padEnd(barWidth)}] ${stats.count} (${percentage}%)`);
  }

  console.log('═══════════════════════════════════════════════════════════════════════════\n');
}

analyzeEconomy5LevelRanges().catch(console.error);
