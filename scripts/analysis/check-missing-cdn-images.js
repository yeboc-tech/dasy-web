#!/usr/bin/env node

/**
 * Script to check for missing CDN images for tagged subjects
 * Also checks edited_contents table as fallback
 *
 * Usage: node scripts/check-missing-cdn-images.js
 */

// Load environment variables from .env
require('dotenv').config({ path: '.env' });

const { createClient } = require('@supabase/supabase-js');

// CDN base URL
const CDN_BASE_URL = 'https://cdn.y3c.kr/tongkidari/contents';

// Tagged subjects to check
const TAGGED_SUBJECTS = ['경제', '사회문화', '생활과윤리'];

// Supabase connection
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Check if a URL exists (returns 200)
 */
async function checkUrlExists(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Get tag type for a subject
 */
function getTagType(subject) {
  return `단원_사회탐구_${subject}`;
}

/**
 * Fetch all edited_contents resource_ids for a subject
 */
async function fetchEditedContents(subject) {
  const { data, error } = await supabase
    .from('edited_contents')
    .select('resource_id')
    .like('resource_id', `${subject}_%`);

  if (error) {
    console.error(`Error fetching edited_contents for ${subject}:`, error);
    return new Set();
  }

  return new Set((data || []).map(item => item.resource_id));
}

/**
 * Check images for a single subject
 */
async function checkSubjectImages(subject) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Checking ${subject}...`);
  console.log('='.repeat(60));

  const tagType = getTagType(subject);

  // Fetch all problem_ids for this subject
  const { data, error } = await supabase
    .from('problem_tags')
    .select('problem_id')
    .eq('type', tagType);

  if (error) {
    console.error(`Error fetching ${subject} problems:`, error);
    return { subject, missingProblems: [], missingAnswers: [], total: 0 };
  }

  if (!data || data.length === 0) {
    console.log(`No problems found for ${subject}`);
    return { subject, missingProblems: [], missingAnswers: [], total: 0 };
  }

  // Get unique problem_ids
  const problemIds = [...new Set(data.map(item => item.problem_id))];
  console.log(`Found ${problemIds.length} unique problems in DB`);

  // Fetch edited_contents for this subject
  console.log('Fetching edited_contents...');
  const editedContents = await fetchEditedContents(subject);
  console.log(`Found ${editedContents.size} items in edited_contents`);

  const missingProblems = [];
  const missingAnswers = [];
  const inEditedContentsProblems = [];
  const inEditedContentsAnswers = [];
  let checked = 0;

  // Check each problem (with rate limiting)
  const BATCH_SIZE = 10;
  const DELAY_MS = 100;

  for (let i = 0; i < problemIds.length; i += BATCH_SIZE) {
    const batch = problemIds.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (problemId) => {
        const problemUrl = `${CDN_BASE_URL}/${encodeURIComponent(problemId)}.png`;
        const answerId = problemId.replace('_문제', '_해설');
        const answerUrl = `${CDN_BASE_URL}/${encodeURIComponent(answerId)}.png`;

        const [problemExists, answerExists] = await Promise.all([
          checkUrlExists(problemUrl),
          checkUrlExists(answerUrl)
        ]);

        // Check if in edited_contents
        const problemInEdited = editedContents.has(problemId);
        const answerInEdited = editedContents.has(answerId);

        return {
          problemId,
          answerId,
          problemExists,
          answerExists,
          problemInEdited,
          answerInEdited
        };
      })
    );

    results.forEach(({ problemId, answerId, problemExists, answerExists, problemInEdited, answerInEdited }) => {
      if (!problemExists) {
        if (problemInEdited) {
          inEditedContentsProblems.push(problemId);
        } else {
          missingProblems.push(problemId);
        }
      }
      if (!answerExists) {
        if (answerInEdited) {
          inEditedContentsAnswers.push(answerId);
        } else {
          missingAnswers.push(answerId);
        }
      }
    });

    checked += batch.length;
    process.stdout.write(`\rChecked ${checked}/${problemIds.length} problems...`);

    // Rate limiting delay
    if (i + BATCH_SIZE < problemIds.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  console.log('\n');

  return {
    subject,
    total: problemIds.length,
    missingProblems,
    missingAnswers,
    inEditedContentsProblems,
    inEditedContentsAnswers
  };
}

/**
 * Main function
 */
async function main() {
  console.log('CDN Image Checker for Tagged Subjects');
  console.log('=====================================');
  console.log(`CDN Base URL: ${CDN_BASE_URL}`);
  console.log(`Subjects to check: ${TAGGED_SUBJECTS.join(', ')}`);
  console.log('Also checking edited_contents table as fallback');

  const results = [];

  for (const subject of TAGGED_SUBJECTS) {
    const result = await checkSubjectImages(subject);
    results.push(result);
  }

  // Summary
  console.log('\n');
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  let totalMissingProblems = 0;
  let totalMissingAnswers = 0;
  let totalInEditedProblems = 0;
  let totalInEditedAnswers = 0;

  for (const result of results) {
    console.log(`\n${result.subject}:`);
    console.log(`  Total problems in DB: ${result.total}`);
    console.log(`  Missing from CDN (in edited_contents): ${result.inEditedContentsProblems.length} problems, ${result.inEditedContentsAnswers.length} answers`);
    console.log(`  TRULY MISSING (not in CDN or edited_contents): ${result.missingProblems.length} problems, ${result.missingAnswers.length} answers`);

    totalMissingProblems += result.missingProblems.length;
    totalMissingAnswers += result.missingAnswers.length;
    totalInEditedProblems += result.inEditedContentsProblems.length;
    totalInEditedAnswers += result.inEditedContentsAnswers.length;

    if (result.missingProblems.length > 0) {
      console.log(`\n  TRULY MISSING problem images:`);
      result.missingProblems.forEach(id => console.log(`    - ${id}`));
    }

    if (result.missingAnswers.length > 0) {
      console.log(`\n  TRULY MISSING answer images:`);
      result.missingAnswers.forEach(id => console.log(`    - ${id}`));
    }
  }

  console.log('\n');
  console.log('='.repeat(60));
  console.log(`IN EDITED_CONTENTS (OK): ${totalInEditedProblems} problems, ${totalInEditedAnswers} answers`);
  console.log(`TRULY MISSING: ${totalMissingProblems} problems, ${totalMissingAnswers} answers`);
  console.log('='.repeat(60));

  // Write detailed results to file
  const outputFile = 'missing-cdn-images.json';
  const fs = require('fs');

  const output = {
    summary: {
      inEditedContents: {
        problems: totalInEditedProblems,
        answers: totalInEditedAnswers
      },
      trulyMissing: {
        problems: totalMissingProblems,
        answers: totalMissingAnswers
      }
    },
    bySubject: results.map(r => ({
      subject: r.subject,
      total: r.total,
      inEditedContents: {
        problems: r.inEditedContentsProblems,
        answers: r.inEditedContentsAnswers
      },
      trulyMissing: {
        problems: r.missingProblems,
        answers: r.missingAnswers
      }
    }))
  };

  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
  console.log(`\nDetailed results written to: ${outputFile}`);
}

main().catch(console.error);
