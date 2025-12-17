/**
 * Create worksheet from verified JSON
 *
 * Usage: node create-worksheet-from-verified.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Use service role key for write access
const supabase = createClient(
  process.env.NEXT_PUBLIC_REMOTE_SUPABASE_URL,
  process.env.REMOTE_SUPABASE_SERVICE_ROLE_KEY
);

async function createWorksheet() {
  // Read verified JSON
  const verifiedPath = path.join(__dirname, '../../data/imports/1권3단원_verified.json');
  const verified = JSON.parse(fs.readFileSync(verifiedPath, 'utf8'));

  console.log('=== Source Data ===');
  console.log('Total rows:', verified.summary.total);
  console.log('Exists in DB:', verified.summary.existsInDB);
  console.log('Missing from DB:', verified.summary.missingFromDB);
  console.log('No ID:', verified.summary.noId);

  // Get ALL problem IDs with a final ID (include missing from DB - contents team will add later)
  const problemIds = verified.data
    .filter(row => row.통키다리No_final)
    .map(row => row.통키다리No_final);

  console.log('\n=== Worksheet Data ===');
  console.log('Problem IDs to include:', problemIds.length);

  // Worksheet data
  const worksheetData = {
    title: '요약한 통합사회 1권 3단원',
    author: '민성원T',
    is_public: false,
    created_by: 'acc6591d-ccf7-46b1-9b8a-d39b5ca27b7c',
    selected_problem_ids: problemIds,
    sorting: [{ field: 'manual', direction: 'asc' }]
  };

  console.log('\nTitle:', worksheetData.title);
  console.log('Author:', worksheetData.author);
  console.log('Created by:', worksheetData.created_by);
  console.log('Is public:', worksheetData.is_public);
  console.log('Sorting:', JSON.stringify(worksheetData.sorting));
  console.log('First 5 IDs:', problemIds.slice(0, 5));

  // Insert into database
  console.log('\n=== Inserting into database ===');

  const { data, error } = await supabase
    .from('worksheets')
    .insert(worksheetData)
    .select()
    .single();

  if (error) {
    console.error('Error inserting worksheet:', error);
    process.exit(1);
  }

  console.log('\nWorksheet created successfully!');
  console.log('ID:', data.id);
  console.log('Created at:', data.created_at);

  return data;
}

createWorksheet().catch(console.error);
