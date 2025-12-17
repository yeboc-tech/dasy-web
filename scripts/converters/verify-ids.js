/**
 * Verify problem IDs against database results
 *
 * Usage: node verify-ids.js
 */

const fs = require('fs');
const path = require('path');

// IDs found in DB (from query)
const foundInDb = new Set([
  '생활과윤리_고3_2020_04_학평_20_문제','생활과윤리_고3_2020_09_모평_10_문제','생활과윤리_고3_2021_03_학평_14_문제',
  '생활과윤리_고3_2021_06_모평_10_문제','생활과윤리_고3_2021_06_모평_11_문제','생활과윤리_고3_2021_07_학평_15_문제',
  '생활과윤리_고3_2021_10_학평_9_문제','생활과윤리_고3_2022_03_학평_8_문제','생활과윤리_고3_2022_09_모평_10_문제',
  '생활과윤리_고3_2022_10_학평_15_문제','생활과윤리_고3_2023_03_학평_15_문제','생활과윤리_고3_2023_06_모평_16_문제',
  '생활과윤리_고3_2024_04_학평_10_문제','생활과윤리_고3_2024_06_모평_20_문제','생활과윤리_고3_2024_06_모평_9_문제',
  '생활과윤리_고3_2024_09_모평_4_문제','생활과윤리_고3_2024_09_모평_6_문제','생활과윤리_고3_2024_10_학평_10_문제',
  '생활과윤리_고3_2024_11_수능_9_문제','세계지리_고3_2009_10_학평_6_문제','세계지리_고3_2018_06_모평_13_문제',
  '세계지리_고3_2018_09_모평_11_문제','세계지리_고3_2019_07_학평_15_문제','세계지리_고3_2020_03_학평_16_문제',
  '세계지리_고3_2020_04_학평_16_문제','세계지리_고3_2020_04_학평_9_문제','세계지리_고3_2020_06_모평_20_문제',
  '세계지리_고3_2020_06_모평_9_문제','세계지리_고3_2020_09_모평_17_문제','세계지리_고3_2020_09_모평_2_문제',
  '세계지리_고3_2020_10_학평_20_문제','세계지리_고3_2020_10_학평_5_문제','세계지리_고3_2020_11_수능_9_문제',
  '세계지리_고3_2021_04_학평_5_문제','세계지리_고3_2021_06_모평_13_문제','세계지리_고3_2021_06_모평_16_문제',
  '세계지리_고3_2021_07_학평_2_문제','세계지리_고3_2021_07_학평_5_문제','세계지리_고3_2021_09_모평_20_문제',
  '세계지리_고3_2021_10_학평_9_문제','세계지리_고3_2021_11_수능_16_문제','세계지리_고3_2022_03_학평_12_문제',
  '세계지리_고3_2022_03_학평_4_문제','세계지리_고3_2022_04_학평_18_문제','세계지리_고3_2022_06_모평_15_문제',
  '세계지리_고3_2022_06_모평_16_문제','세계지리_고3_2022_06_모평_7_문제','세계지리_고3_2022_11_수능_8_문제',
  '세계지리_고3_2023_03_학평_19_문제','세계지리_고3_2023_04_학평_19_문제','세계지리_고3_2023_04_학평_3_문제',
  '세계지리_고3_2023_07_학평_15_문제','세계지리_고3_2023_10_학평_12_문제','세계지리_고3_2023_11_수능_19_문제',
  '세계지리_고3_2024_04_학평_3_문제','세계지리_고3_2024_07_학평_15_문제','세계지리_고3_2024_09_모평_20_문제',
  '세계지리_고3_2024_10_학평_14_문제','세계지리_고3_2024_11_수능_3_문제'
]);

// Read refined JSON
const refinedPath = path.join(__dirname, '../../data/imports/1권3단원_refined.json');
const refined = JSON.parse(fs.readFileSync(refinedPath, 'utf8'));

// Verify each row
const verified = refined.data.map(row => {
  const id = row.통키다리No_final;
  const existsInDB = id ? foundInDb.has(id) : null;

  return {
    ...row,
    existsInDB
  };
});

// Calculate summary
const summary = {
  total: verified.length,
  withId: verified.filter(r => r.통키다리No_final).length,
  existsInDB: verified.filter(r => r.existsInDB === true).length,
  missingFromDB: verified.filter(r => r.existsInDB === false).length,
  noId: verified.filter(r => r.existsInDB === null).length
};

// Output verified JSON
const output = {
  source: refined.source,
  sheet: refined.sheet,
  verifiedAt: new Date().toISOString(),
  summary: summary,
  data: verified
};

const outputPath = path.join(__dirname, '../../data/imports/1권3단원_verified.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');

console.log('Saved:', outputPath);
console.log('\n=== Verification Summary ===');
console.log('Total rows:', summary.total);
console.log('With ID:', summary.withId);
console.log('Exists in DB:', summary.existsInDB);
console.log('Missing from DB:', summary.missingFromDB);
console.log('No ID:', summary.noId);

// Show missing from DB
const missing = verified.filter(r => r.existsInDB === false);
if (missing.length > 0) {
  console.log('\n=== Missing from DB ===');
  missing.forEach(r => {
    console.log(`Row ${r.row}: ${r.통키다리No_final}`);
    console.log(`  요통사: ${r.요통사교재No}`);
    console.log(`  특이사항: ${r.특이사항 || '-'}`);
  });
}

// Show no ID rows
const noId = verified.filter(r => r.existsInDB === null);
if (noId.length > 0) {
  console.log('\n=== No ID (cannot verify) ===');
  noId.forEach(r => {
    console.log(`Row ${r.row}: page ${r.페이지}, problem ${r.문항}`);
  });
}
