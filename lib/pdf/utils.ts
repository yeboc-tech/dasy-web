import fs from 'fs';
import path from 'path';
import problemDb from '../../public/problems/db-index';

export function createTwoColumnLayout(problems: string[], base64Images: string[]) {
  const columns: any[] = [];
  
  for (let i = 0; i < problems.length; i += 2) {
    const leftProblem = base64Images[i];
    const rightProblem = base64Images[i + 1];
    
    const columnContent: any[] = [];
    
    if (leftProblem) {
      columnContent.push({
        image: leftProblem,
        width: 240,
        alignment: 'center',
        margin: [0, 0, 0, 20]
      });
    }
    
    if (rightProblem) {
      columnContent.push({
        image: rightProblem,
        width: 240,
        alignment: 'center',
        margin: [0, 0, 0, 20]
      });
    }
    
    // Ensure we have at least one column
    if (columnContent.length > 0) {
      columns.push({
        columns: columnContent,
        columnGap: 15,
        margin: [0, 0, 0, 30]
      });
    }
  }
  
  return columns;
}

export function createFooter(currentPage: number, pageCount: number) {
  return [
    {
      canvas: [
        {
          type: 'line',
          x1: 0, y1: 0, x2: 595, y2: 0,
          lineWidth: 1,
          lineColor: '#e0e0e0'
        }
      ],
      margin: [0, 0, 0, 0]
    },
    {
      text: `${currentPage}`,
      alignment: 'center',
      fontSize: 10,
      color: '#666666',
      margin: [0, 8, 0, 0]
    }
  ];
} 

export async function imageToBase64(imagePath: string): Promise<string> {
  try {
    // Handle both old and new image paths
    let fullPath: string;
    if (imagePath.startsWith('/dummies/')) {
      // New path: /dummies/problem_001.png
      const relativePath = imagePath.replace('/dummies/', '');
      fullPath = path.join(process.cwd(), 'public', 'dummies', relativePath);
    } else if (imagePath.startsWith('/problems/')) {
      // Old path: /problems/chapter/problem.png
      const relativePath = imagePath.replace('/problems/', '');
      fullPath = path.join(process.cwd(), 'public', 'problems', relativePath);
    } else {
      // Direct path: problem_001.png
      fullPath = path.join(process.cwd(), 'public', 'dummies', imagePath);
    }
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Image file does not exist: ${fullPath}`);
    }
    
    const imageBuffer = fs.readFileSync(fullPath);
    const base64 = imageBuffer.toString('base64');
    const extension = path.extname(imagePath).substring(1);
    const dataUrl = `data:image/${extension};base64,${base64}`;
    
    return dataUrl;
  } catch (error) {
    console.error(`Error loading image ${imagePath}:`, error);
    throw new Error(`Failed to load image: ${imagePath} - ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function getRandomProblems(count: number = 20): string[] {
  const allProblems: string[] = [];
  
  Object.keys(problemDb).forEach(chapter => {
    const chapterProblems = problemDb[chapter as keyof typeof problemDb];
    chapterProblems.forEach((problem: string) => {
      allProblems.push(`${chapter}/${problem}`);
    });
  });
  
  const shuffled = allProblems.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}