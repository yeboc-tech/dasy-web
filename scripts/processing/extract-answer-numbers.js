require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Map Korean circled numbers to integers
const KOREAN_NUMBERS = {
  '①': 1,
  '②': 2,
  '③': 3,
  '④': 4,
  '⑤': 5
};

function extractAnswerNumber(answerText) {
  if (!answerText || typeof answerText !== 'string') {
    return null;
  }

  // Clean up the text and handle various edge cases
  const cleanText = answerText.trim();

  // Pattern 1: Look for "정답 [①-⑤]" or "정답[①-⑤]" anywhere in the text
  const answerPattern = /정답\s*([①②③④⑤])/;
  const match = cleanText.match(answerPattern);

  if (match && match[1]) {
    const koreanNumber = match[1];
    return KOREAN_NUMBERS[koreanNumber] || null;
  }

  // Pattern 2: Look for standalone Korean numbers at the beginning after dots
  const standalonePattern = /^[.\s]*([①②③④⑤])/;
  const standaloneMatch = cleanText.match(standalonePattern);

  if (standaloneMatch && standaloneMatch[1]) {
    const koreanNumber = standaloneMatch[1];
    return KOREAN_NUMBERS[koreanNumber] || null;
  }

  return null;
}

async function getProblemsWithAnswerText() {
  console.log('🔍 Fetching problems with answer text...');

  const { data: problems, error } = await supabase
    .from('problems')
    .select('id, answer_text, answer')
    .not('answer_text', 'is', null)
    .neq('answer_text', '');

  if (error) {
    throw new Error(`Failed to fetch problems: ${error.message}`);
  }

  console.log(`📋 Found ${problems.length} problems with answer text`);
  return problems;
}

async function updateAnswerNumber(problemId, answerNumber) {
  console.log(`💾 Updating answer number for ${problemId}: ${answerNumber}`);

  try {
    const { data, error } = await supabase
      .from('problems')
      .update({ answer: answerNumber })
      .eq('id', problemId)
      .select('id, answer');

    if (error) {
      throw error;
    }

    return data[0];
  } catch (error) {
    console.error(`❌ Failed to update ${problemId}:`, error.message);
    throw error;
  }
}

async function processAnswerExtraction() {
  console.log('🚀 Starting Answer Number Extraction');
  console.log('='.repeat(60));

  try {
    // Fetch all problems with answer text
    const problems = await getProblemsWithAnswerText();

    if (problems.length === 0) {
      console.log('🎉 No problems with answer text found!');
      return;
    }

    const results = {
      total: problems.length,
      extracted: 0,
      updated: 0,
      alreadyHad: 0,
      failed: 0,
      failedCases: []
    };

    console.log('\n🔄 Processing answer extractions...\n');

    for (let i = 0; i < problems.length; i++) {
      const problem = problems[i];
      const { id, answer_text, answer: currentAnswer } = problem;

      try {
        // Extract answer number
        const extractedAnswer = extractAnswerNumber(answer_text);

        if (extractedAnswer !== null) {
          results.extracted++;

          // Only update if current answer is null or different
          if (currentAnswer === null || currentAnswer !== extractedAnswer) {
            await updateAnswerNumber(id, extractedAnswer);
            results.updated++;
            console.log(`✅ ${i + 1}/${problems.length}: ${id} → Answer: ${extractedAnswer}`);
          } else {
            results.alreadyHad++;
            console.log(`✓ ${i + 1}/${problems.length}: ${id} → Already has answer: ${currentAnswer}`);
          }
        } else {
          results.failed++;
          results.failedCases.push({
            id,
            preview: answer_text.substring(0, 100) + '...'
          });
          console.log(`❌ ${i + 1}/${problems.length}: ${id} → Could not extract answer`);
          console.log(`   Preview: ${answer_text.substring(0, 100)}...`);
        }

        // Small delay to be respectful to database
        if (i < problems.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        results.failed++;
        results.failedCases.push({
          id,
          error: error.message
        });
        console.error(`❌ ${i + 1}/${problems.length}: Failed to process ${id}:`, error.message);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 EXTRACTION SUMMARY');
    console.log('='.repeat(60));
    console.log(`📝 Total problems: ${results.total}`);
    console.log(`🎯 Successfully extracted: ${results.extracted}`);
    console.log(`💾 Updated in database: ${results.updated}`);
    console.log(`✓ Already had answers: ${results.alreadyHad}`);
    console.log(`❌ Failed extractions: ${results.failed}`);
    console.log(`📈 Success rate: ${((results.extracted / results.total) * 100).toFixed(1)}%`);

    if (results.failedCases.length > 0) {
      console.log('\n❌ Failed cases:');
      results.failedCases.forEach((failure, index) => {
        console.log(`${index + 1}. ${failure.id}`);
        if (failure.preview) {
          console.log(`   Preview: ${failure.preview}`);
        }
        if (failure.error) {
          console.log(`   Error: ${failure.error}`);
        }
      });
    }

    return results;

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Test function for manual testing
function testExtraction() {
  const testCases = [
    '정답 ①\n정답 해설\n법치주의의 유형...',
    '정답⑤\n정답 해설\nt+1기갑국 X재 시장의...',
    '정답 ⑤\n정답 해설\nA는 형식적 법치주의...',
    '...\n정답 ④\n정답 해설\n법치주의의 유형...',
    '............\n정답 ③\n정답 해설\n갑국 정부가...',
    '총수요가 증가하면 총수요 곡선은 오른쪽으로 이동하고, 총수요가 감소하면 총수요 곡선은\n정답 ①\n정답 해설\n..........',
    'invalid text without answer'
  ];

  console.log('🧪 Testing answer extraction logic:\n');

  testCases.forEach((testCase, index) => {
    const result = extractAnswerNumber(testCase);
    console.log(`Test ${index + 1}:`);
    console.log(`Input: ${testCase.substring(0, 50)}...`);
    console.log(`Result: ${result}`);
    console.log('---');
  });
}

if (require.main === module) {
  if (process.argv.includes('--test')) {
    testExtraction();
  } else {
    processAnswerExtraction();
  }
}

module.exports = {
  extractAnswerNumber,
  processAnswerExtraction,
  testExtraction
};