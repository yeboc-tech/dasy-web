const fs = require('fs');
const path = require('path');

// Function to get all PNG files in the dummies folder
function getProblemFiles() {
  const dummiesPath = path.join(__dirname, '..', 'public', 'dummies');
  const files = fs.readdirSync(dummiesPath)
    .filter(file => file.endsWith('.png'))
    .sort();
  
  return files.map(file => path.join(dummiesPath, file));
}

// Function to renumber files
function renumberFiles() {
  const files = getProblemFiles();
  const dummiesPath = path.join(__dirname, '..', 'public', 'dummies');
  
  console.log(`Found ${files.length} problem files`);
  
  // Create a mapping of old names to new names
  const fileMapping = {};
  
  files.forEach((filePath, index) => {
    const oldName = path.basename(filePath);
    const newName = `problem_${String(index + 1).padStart(3, '0')}.png`;
    
    if (oldName !== newName) {
      fileMapping[oldName] = newName;
      const newPath = path.join(dummiesPath, newName);
      
      // Rename the file
      fs.renameSync(filePath, newPath);
      console.log(`Renamed: ${oldName} → ${newName}`);
    }
  });
  
  return fileMapping;
}

// Function to update metadata
function updateMetadata(fileMapping) {
  const metadataPath = path.join(__dirname, '..', 'public', 'dummies', 'problems-metadata.json');
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  
  // Create reverse mapping (new name to old name)
  const reverseMapping = {};
  Object.keys(fileMapping).forEach(oldName => {
    reverseMapping[fileMapping[oldName]] = oldName;
  });
  
  // Update each problem's filename and id
  metadata.problems.forEach((problem, index) => {
    const newId = index + 1;
    const newFilename = `problem_${String(newId).padStart(3, '0')}.png`;
    
    // Check if this problem's old filename exists in our mapping
    const oldFilename = problem.filename;
    if (reverseMapping[oldFilename] || oldFilename === newFilename) {
      problem.id = newId;
      problem.filename = newFilename;
    } else {
      // This problem was removed, mark it for deletion
      problem.is_active = false;
    }
  });
  
  // Remove inactive problems and keep only the first 70
  metadata.problems = metadata.problems
    .filter(problem => problem.is_active)
    .slice(0, 70);
  
  // Update metadata summary
  metadata.metadata.total_problems = metadata.problems.length;
  metadata.metadata.updated_at = new Date().toISOString();
  
  // Write updated metadata
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
  
  console.log(`Updated metadata for ${metadata.problems.length} problems`);
}

// Main execution
try {
  console.log('Starting problem renumbering...');
  
  // Renumber the files
  const fileMapping = renumberFiles();
  
  // Update the metadata
  updateMetadata(fileMapping);
  
  console.log('Problem renumbering completed successfully!');
  
  // Verify the results
  const finalFiles = getProblemFiles();
  console.log(`\nFinal count: ${finalFiles.length} files`);
  console.log('First file:', path.basename(finalFiles[0]));
  console.log('Last file:', path.basename(finalFiles[finalFiles.length - 1]));
  
} catch (error) {
  console.error('Error during renumbering:', error);
  process.exit(1);
}
