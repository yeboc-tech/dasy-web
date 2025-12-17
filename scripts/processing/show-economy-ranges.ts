/**
 * Show the actual min-max correct_rate ranges for each economy difficulty level
 *
 * Run with: npx tsx scripts/show-economy-ranges.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface EconomyProblem {
  problem_id: string;
  difficulty: string | null;
  accuracy_rate: number | null;
}

async function showEconomyRanges() {
  console.log('🔍 Analyzing correct_rate ranges for each difficulty level...\n');

  const { data: problems, error } = await supabase
    .from('accuracy_rate')
    .select('problem_id, difficulty, accuracy_rate')
    .like('problem_id', '경제_%')
    .not('accuracy_rate', 'is', null)
    .not('difficulty', 'is', null);

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  // Group by difficulty
  const byDifficulty: Record<string, number[]> = {};

  for (const p of problems as EconomyProblem[]) {
    const diff = p.difficulty!;
    const rate = p.accuracy_rate!;

    if (!byDifficulty[diff]) {
      byDifficulty[diff] = [];
    }
    byDifficulty[diff].push(rate);
  }

  // Sort by average rate (hardest first)
  const sorted = Object.entries(byDifficulty).sort((a, b) => {
    const avgA = a[1].reduce((sum, r) => sum + r, 0) / a[1].length;
    const avgB = b[1].reduce((sum, r) => sum + r, 0) / b[1].length;
    return avgA - avgB;
  });

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('📊 CORRECT_RATE RANGES BY DIFFICULTY');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('Level | Count |  Min  |  Max  | Avg  | Visual Range (0-100%)');
  console.log('──────┼───────┼───────┼───────┼──────┼───────────────────────────────');

  const visualWidth = 50;

  for (const [diff, rates] of sorted) {
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const avg = rates.reduce((sum, r) => sum + r, 0) / rates.length;

    // Create visual bar
    const startPos = Math.floor((min / 100) * visualWidth);
    const endPos = Math.ceil((max / 100) * visualWidth);
    const barLength = endPos - startPos;

    const before = ' '.repeat(startPos);
    const bar = '█'.repeat(Math.max(1, barLength));
    const after = ' '.repeat(Math.max(0, visualWidth - startPos - bar.length));

    console.log(
      `${diff.padEnd(5)} | ${rates.length.toString().padStart(5)} | ` +
      `${min.toFixed(0).padStart(5)} | ${max.toFixed(0).padStart(5)} | ` +
      `${avg.toFixed(1).padStart(4)} | ` +
      `${before}${bar}${after}`
    );
  }

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('      |       |       |       |      | 0    25    50    75   100%\n');

  // Check for overlaps
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🔍 OVERLAP ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  for (let i = 0; i < sorted.length; i++) {
    const [diff1, rates1] = sorted[i];
    const max1 = Math.max(...rates1);

    for (let j = i + 1; j < sorted.length; j++) {
      const [diff2, rates2] = sorted[j];
      const min2 = Math.min(...rates2);

      if (max1 >= min2) {
        // There's overlap
        const overlapStart = min2;
        const overlapEnd = max1;

        // Count how many problems fall in overlap range
        const count1 = rates1.filter(r => r >= overlapStart && r <= overlapEnd).length;
        const count2 = rates2.filter(r => r >= overlapStart && r <= overlapEnd).length;

        console.log(`⚠️  ${diff1} (max ${max1}%) overlaps with ${diff2} (min ${min2}%)`);
        console.log(`   Overlap range: ${overlapStart}-${overlapEnd}%`);
        console.log(`   Problems in overlap: ${diff1}=${count1}, ${diff2}=${count2}`);
        console.log('');
      }
    }
  }

  // Show distribution within ranges
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('📈 DETAILED DISTRIBUTION (every 5%)');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  for (const [diff, rates] of sorted) {
    console.log(`${diff} (${rates.length} problems):`);

    // Create histogram
    const buckets: Record<number, number> = {};
    for (let i = 0; i <= 100; i += 5) {
      buckets[i] = 0;
    }

    for (const rate of rates) {
      const bucket = Math.floor(rate / 5) * 5;
      buckets[bucket]++;
    }

    for (let i = 0; i <= 100; i += 5) {
      if (buckets[i] > 0) {
        const bar = '▓'.repeat(Math.ceil(buckets[i] / 5));
        console.log(`  ${i.toString().padStart(3)}-${(i+4).toString().padEnd(3)}%: ${bar} ${buckets[i]}`);
      }
    }
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════════════\n');
}

showEconomyRanges().catch(console.error);
