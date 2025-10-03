const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'public/data');
console.log('Checking directory:', dataDir);

const allFiles = fs.readdirSync(dataDir);
console.log('Total files:', allFiles.length);

const pngFiles = allFiles.filter(f => f.endsWith('.png'));
console.log('PNG files:', pngFiles.length);

const economicsFiles = [];

pngFiles.forEach(file => {
  if (!file.endsWith('.png')) return;

  const normalizedFile = file.normalize('NFC');
  const searchPattern = '경제'.normalize('NFC');

  if (!normalizedFile.startsWith(searchPattern) || !/\d/.test(normalizedFile)) return;

  // Extract problem number
  const match = normalizedFile.match(/경제(\d+)(-a)?\.png$/);
  if (match) {
    economicsFiles.push({
      file: file,
      number: match[1],
      isAnswer: !!match[2]
    });
  }
});

console.log('\nEconomics files found:', economicsFiles.length);
economicsFiles.slice(0, 10).forEach(f => {
  console.log(`  ${f.file} -> ${f.number} (answer: ${f.isAnswer})`);
});

// Group by problem number
const grouped = {};
economicsFiles.forEach(f => {
  if (!grouped[f.number]) {
    grouped[f.number] = { problem: null, answer: null };
  }
  if (f.isAnswer) {
    grouped[f.number].answer = f.file;
  } else {
    grouped[f.number].problem = f.file;
  }
});

const completeProblems = Object.entries(grouped)
  .filter(([num, files]) => files.problem && files.answer)
  .map(([num, files]) => ({ number: parseInt(num), ...files }))
  .sort((a, b) => a.number - b.number);

console.log('\nComplete problems (both images):', completeProblems.length);
completeProblems.slice(0, 5).forEach(p => {
  console.log(`  경제${p.number}: ${p.problem} + ${p.answer}`);
});