const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Uses AWS credentials from environment variables or ~/.aws/credentials
const s3 = new AWS.S3({
  region: 'ap-northeast-2'
});

async function generateExamsJson() {
  console.log('Fetching files from S3...');

  // Fetch all files from S3
  let allFiles = [];
  let continuationToken = null;

  do {
    const params = {
      Bucket: 'cdn.y3c.kr',
      Prefix: 'tongkidari/pdfs/',
      ContinuationToken: continuationToken
    };
    const data = await s3.listObjectsV2(params).promise();
    allFiles = allFiles.concat(data.Contents || []);
    continuationToken = data.IsTruncated ? data.NextContinuationToken : null;
  } while (continuationToken);

  console.log('Total files fetched:', allFiles.length);

  // Parse filenames and group into exams
  const exams = {};
  const unparsedFiles = [];
  const regex = /^(.+)_고(\d)_(\d{4})_(\d{2})_([^_]+)_([^_]+)_(문제|해설)\.pdf$/;

  allFiles.forEach(item => {
    // Normalize Unicode (NFD -> NFC) to handle Korean character variations
    let filename = item.Key.replace('tongkidari/pdfs/', '').normalize('NFC');
    if (!filename || !filename.endsWith('.pdf')) return;

    const match = filename.match(regex);
    if (!match) {
      unparsedFiles.push(filename);
      return;
    }

    const [, subject, grade, year, month, examType, region, type] = match;

    // Create unique exam key
    const id = `${subject}_고${grade}_${year}_${month}_${examType}_${region}`;

    if (!exams[id]) {
      exams[id] = {
        id,
        subject,
        grade: `고${grade}`,
        gradeNum: parseInt(grade),
        year: parseInt(year),
        month,
        monthNum: parseInt(month),
        examType,
        region: region === 'NA' ? null : region,
        problemPdf: null,
        answerPdf: null,
        hasProblem: false,
        hasAnswer: false,
      };
    }

    if (type === '문제') {
      exams[id].problemPdf = filename;
      exams[id].hasProblem = true;
    } else {
      exams[id].answerPdf = filename;
      exams[id].hasAnswer = true;
    }
  });

  // Convert to array and sort (newest first)
  const examList = Object.values(exams)
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      if (b.monthNum !== a.monthNum) return b.monthNum - a.monthNum;
      return a.subject.localeCompare(b.subject);
    });

  // Compute filter options
  const subjects = [...new Set(examList.map(e => e.subject))].sort();
  const grades = [...new Set(examList.map(e => e.grade))].sort();
  const years = [...new Set(examList.map(e => e.year))].sort((a, b) => b - a);
  const months = [...new Set(examList.map(e => e.month))].sort();
  const examTypes = [...new Set(examList.map(e => e.examType))].sort();
  const regions = [...new Set(examList.map(e => e.region))].sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return a.localeCompare(b);
  });

  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalExams: examList.length,
      filters: {
        subjects,
        grades,
        years,
        months,
        examTypes,
        regions
      }
    },
    exams: examList
  };

  // Write to file
  const outputPath = path.join(__dirname, '..', 'data', 'exams.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log('\n=== RESULT ===');
  console.log('Total exams:', examList.length);
  console.log('\nFilters:');
  console.log('  Subjects:', subjects.length, '-', subjects.join(', '));
  console.log('  Grades:', grades.join(', '));
  console.log('  Years:', years.length, '- from', Math.min(...years), 'to', Math.max(...years));
  console.log('  Months:', months.join(', '));
  console.log('  Exam types:', examTypes.join(', '));
  console.log('  Regions:', regions.filter(r => r).join(', '), '+ null (national)');

  // Check for incomplete exams
  const missingProblem = examList.filter(e => !e.hasProblem);
  const missingAnswer = examList.filter(e => !e.hasAnswer);

  console.log('\nData integrity:');
  console.log('  Missing problem PDF:', missingProblem.length);
  if (missingProblem.length > 0) {
    missingProblem.forEach(e => console.log('    -', e.id));
  }
  console.log('  Missing answer PDF:', missingAnswer.length);
  if (missingAnswer.length > 0) {
    missingAnswer.forEach(e => console.log('    -', e.id));
  }

  if (unparsedFiles.length > 0) {
    console.log('\nUnparsed files:', unparsedFiles.length);
    unparsedFiles.forEach(f => console.log('  -', f));
  }

  console.log('\nFile written to:', outputPath);
}

generateExamsJson().catch(console.error);
