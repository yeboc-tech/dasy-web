// Client-side pdfMake setup using CDN approach
interface PdfMakeAPI {
  createPdf: (docDefinition: unknown) => {
    getBlob: (callback: (blob: Blob) => void) => void;
  };
  vfs: Record<string, string>;
}

interface PdfMakeWindow {
  pdfMake?: PdfMakeAPI;
}

let pdfMake: PdfMakeAPI | null = null;
let fontsLoaded = false;

async function loadPdfMake() {
  if (pdfMake && fontsLoaded) return pdfMake;
  
  try {
    // Load pdfMake from CDN for better client-side compatibility
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js';
    script.async = true;
    
    const fontsScript = document.createElement('script');
    fontsScript.src = '/fonts/vfs_fonts.js';
    fontsScript.async = true;
    
    // Wait for both scripts to load
    await new Promise<void>((resolve, reject) => {
      script.onload = () => {
        fontsScript.onload = () => {
          // Access the global pdfMake object
          pdfMake = (window as PdfMakeWindow).pdfMake || null;
          
          // Configure fonts including custom fonts from VFS
          if (pdfMake) {
            try {
              // Check if VFS is loaded - the global vfs variable should be available
              const globalVfs = (window as unknown as { vfs?: Record<string, string> }).vfs;
              // Assign the global vfs to pdfMake.vfs
              if (globalVfs) {
                (pdfMake as unknown as { vfs: Record<string, string> }).vfs = globalVfs;
              }
              
              // Configure CrimsonText since it's available in VFS
              (pdfMake as unknown as { fonts: Record<string, unknown> }).fonts = {
                CrimsonText: {
                  normal: 'CrimsonText-Regular.ttf',
                  bold: 'CrimsonText-Bold.ttf',
                  italics: 'CrimsonText-Italic.ttf',
                  bolditalics: 'CrimsonText-BoldItalic.ttf'
                },
                CrimsonTextSemiBold: {
                  normal: 'CrimsonText-SemiBold.ttf',
                  bold: 'CrimsonText-SemiBold.ttf',
                  italics: 'CrimsonText-SemiBoldItalic.ttf',
                  bolditalics: 'CrimsonText-SemiBoldItalic.ttf'
                }
              };
            } catch (error) {
              console.error('Failed to configure custom fonts:', error);
              console.log('Using default fonts');
            }
          }
          
          fontsLoaded = true;
          resolve();
        };
        fontsScript.onerror = reject;
        document.head.appendChild(fontsScript);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
    
    return pdfMake;
  } catch (error) {
    console.error('Failed to load pdfMake from CDN:', error);
    throw new Error('Failed to load PDF library');
  }
}

export async function imageToBase64Client(imagePath: string): Promise<string> {
  return new Promise((resolve) => {
    // Use the server-side proxy to load images with proper CORS headers
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(imagePath)}`;
    
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Safe to set since we're using our own proxy
    
    img.onload = function() {
      try {
        // Create canvas to convert image to base64
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          console.error('Cannot get canvas context');
          resolve(getNoImageBase64());
          return;
        }
        
        // Set canvas size to match image
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        // Draw image on canvas
        ctx.drawImage(img, 0, 0);
        
        // Convert to base64
        const base64 = canvas.toDataURL('image/png');
        resolve(base64);
      } catch (error) {
        console.error('Error converting proxied image to base64:', error);
        resolve(getNoImageBase64());
      }
    };
    
    img.onerror = function(error) {
      console.error(`Failed to load image via proxy: ${imagePath}`, error);
      resolve(getNoImageBase64());
    };
    
    // Load the image through our proxy
    img.src = proxyUrl;
  });
}


// Helper function to generate a proper PNG base64 image that pdfMake can understand
function getNoImageBase64(): string {
  try {
    // Create a canvas element
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Cannot get canvas context');
    }
    
    // Fill background
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, 300, 200);
    
    // Draw border
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 298, 198);
    
    // Set text properties
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw main text
    ctx.font = '16px Arial, sans-serif';
    ctx.fillText('이미지를 불러올 수 없습니다', 150, 90);
    
    // Draw subtitle
    ctx.font = '12px Arial, sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('S3 설정을 확인하세요', 150, 120);
    
    // Convert canvas to base64 PNG
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Failed to create canvas placeholder:', error);
    // Fallback to a simple 1x1 transparent PNG if canvas fails
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }
}

// Calculate image height based on aspect ratio and fixed width
function calculateImageHeight(base64Image: string, fixedWidth: number = 240): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.naturalHeight / img.naturalWidth;
      const calculatedHeight = fixedWidth * aspectRatio;
      resolve(calculatedHeight);
    };
    img.onerror = () => {
      // Fallback height for failed images
      resolve(200);
    };
    img.src = base64Image;
  });
}

// Get all image heights
async function getAllImageHeights(base64Images: string[], fixedWidth: number = 240): Promise<number[]> {
  const heightPromises = base64Images.map(image => calculateImageHeight(image, fixedWidth));
  return Promise.all(heightPromises);
}

// Calculate available height per page for problems
function getAvailablePageHeight(): number {
  const pageHeight = 842; // A4 height in points
  const topMargin = 60;
  const bottomMargin = 30;
  const footerHeight = 30; // Space for footer
  
  return pageHeight - topMargin - bottomMargin - footerHeight; // ~722 points
}

// Fill a column with problems until height limit is reached
function fillColumn(
  problems: Array<{ image: string; height: number; index: number }>, 
  maxHeight: number
): { columnProblems: Array<{ image: string; height: number; index: number }>; remaining: Array<{ image: string; height: number; index: number }> } {
  const columnProblems = [];
  let currentHeight = 0;
  let i = 0;
  
  while (i < problems.length) {
    const problem = problems[i];
    const numberingHeight = 15; // Reduced from 20 - Height for numbering text and margin
    const problemHeightWithMargin = problem.height + numberingHeight + 15; // Reduced margin from 20 to 15
    
    // Check if adding this problem would exceed height limit
    if (currentHeight + problemHeightWithMargin > maxHeight && columnProblems.length > 0) {
      break;
    }
    
    columnProblems.push(problem);
    currentHeight += problemHeightWithMargin;
    i++;
  }
  
  return {
    columnProblems,
    remaining: problems.slice(i)
  };
}

// Create column content with space-between distribution
function createColumnContent(columnProblems: Array<{ image: string; height: number; index: number }>, maxHeight: number) {
  if (columnProblems.length === 0) return [];
  if (columnProblems.length === 1) {
    return [{
      stack: [
        {
          text: `${columnProblems[0].index + 1}.`,
          fontSize: 12,
          bold: true,
          alignment: 'left',
          margin: [0, 0, 0, 5]
        },
        {
          image: columnProblems[0].image,
          width: 240,
          alignment: 'center',
          margin: [0, 0, 0, 0]
        }
      ],
      unbreakable: true
    }];
  }
  
  // Calculate space between problems for justify distribution
  const totalProblemHeight = columnProblems.reduce((sum, p) => sum + p.height + 15, 0); // Include numbering height
  const availableSpaceForMargins = maxHeight - totalProblemHeight;
  const spaceBetweenProblems = Math.max(15, availableSpaceForMargins / (columnProblems.length - 1));
  
  
  return columnProblems.map((problem, index) => ({
    stack: [
      {
        text: `${problem.index + 1}.`,
        fontSize: 12,
        bold: true,
        alignment: 'left',
        font: 'CrimsonTextSemiBold',
        margin: [0, 0, 0, 5]
      },
      {
        image: problem.image,
        width: 240,
        alignment: 'center',
        margin: [0, 0, 0, 0]
      }
    ],
    unbreakable: true,
    margin: index === columnProblems.length - 1 ? [0, 0, 0, 0] : [0, 0, 0, spaceBetweenProblems]
  }));
}

// Create answer column content with smaller width (1/3 of total problem area)
// Answer images should NOT use justify-between spacing, just start from top with minimal gaps
function createAnswerColumnContent(columnProblems: Array<{ image: string; height: number; index: number }>) {
  if (columnProblems.length === 0) return [];
  
  // For answers, use consistent small margin between images (no justify-between)
  return columnProblems.map((problem, index) => ({
    stack: [
      {
        text: `${problem.index + 1}.`,
        fontSize: 10,
        bold: true,
        alignment: 'left',
        font: 'CrimsonTextSemiBold',
        margin: [0, 0, 0, 3]
      },
      {
        image: problem.image,
        width: 165, // 1/3 of total problem area (495px / 3 = 165px)
        alignment: 'center',
        margin: [0, 0, 0, 0]
      }
    ],
    unbreakable: true,
    margin: index === columnProblems.length - 1 ? [0, 0, 0, 0] : [0, 0, 0, 15] // Fixed 15px gap
  }));
}

// New column-based layout system
export async function createColumnBasedLayoutClient(problems: string[], base64Images: string[]) {
  // Step 1: Calculate all image heights
  const imageHeights = await getAllImageHeights(base64Images);
  
  // Step 2: Get available page height
  const maxPageHeight = getAvailablePageHeight();
  
  // Step 3: Create problem objects with heights
  let remainingProblems = base64Images.map((image, index) => ({
    image,
    height: imageHeights[index],
    index
  }));
  
  const pages = [];
  
  // Step 4: Fill pages column by column
  while (remainingProblems.length > 0) {
    // Fill left column
    const leftColumnResult = fillColumn(remainingProblems, maxPageHeight);
    const leftColumnContent = createColumnContent(leftColumnResult.columnProblems, maxPageHeight);
    
    remainingProblems = leftColumnResult.remaining;
    
    // Fill right column
    const rightColumnResult = fillColumn(remainingProblems, maxPageHeight);
    const rightColumnContent = createColumnContent(rightColumnResult.columnProblems, maxPageHeight);
    
    remainingProblems = rightColumnResult.remaining;
    
    // Create page layout
    const pageColumns = [];
    
    if (leftColumnContent.length > 0) {
      pageColumns.push({
        width: 240,
        stack: leftColumnContent
      });
    }
    
    if (rightColumnContent.length > 0) {
      pageColumns.push({
        width: 240,
        stack: rightColumnContent
      });
    }
    
    if (pageColumns.length > 0) {
      pages.push({
        columns: pageColumns,
        columnGap: 15,
        margin: [0, 0, 0, 0]
      });
    }
    
    // Add page break if there are more problems
    if (remainingProblems.length > 0) {
      pages.push({ pageBreak: 'after', text: '' });
    }
  }
  
  return pages;
}

// Legacy function for backward compatibility (will be replaced)
export function createTwoColumnLayoutClient(problems: string[], base64Images: string[]) {
  const columns: Array<{ columns: unknown[]; columnGap: number; margin?: number[] }> = [];
  
  for (let i = 0; i < problems.length; i += 2) {
    const leftProblem = base64Images[i];
    const rightProblem = base64Images[i + 1];
    
    const columnContent: Array<{ stack: unknown[]; unbreakable: boolean; margin: number[] }> = [];
    
    if (leftProblem) {
      columnContent.push({
        stack: [
          {
            text: `${i + 1}.`,
            fontSize: 12,
            bold: true,
            alignment: 'left',
              margin: [0, 0, 0, 5]
          },
          {
            image: leftProblem,
            width: 240,
            alignment: 'center',
            margin: [0, 0, 0, 0]
          }
        ],
        unbreakable: true,
        margin: [0, 0, 0, 20]
      });
    }
    
    if (rightProblem) {
      columnContent.push({
        stack: [
          {
            text: `${i + 2}.`,
            fontSize: 12,
            bold: true,
            alignment: 'left',
              margin: [0, 0, 0, 5]
          },
          {
            image: rightProblem,
            width: 240,
            alignment: 'center',
            margin: [0, 0, 0, 0]
          }
        ],
        unbreakable: true,
        margin: [0, 0, 0, 20]
      });
    }
    
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

export function createFooterClient(currentPage: number) {
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


// Create answer pages layout with 3 columns
export async function createAnswerPagesClient(
  answerImages: string[], 
  base64AnswerImages: string[]
) {
  if (answerImages.length === 0) return [];
  
  // Calculate image heights for answers (495/3 = 165px total problem area divided by 3)
  const answerHeights = await getAllImageHeights(base64AnswerImages, 165);
  
  // Get available page height
  const maxPageHeight = getAvailablePageHeight();
  
  // Create answer objects with heights
  let remainingAnswers = base64AnswerImages.map((image, index) => ({
    image,
    height: answerHeights[index],
    index
  }));
  
  const pages = [];
  let isFirstPage = true;
  
  // Fill pages with 3 columns
  while (remainingAnswers.length > 0) {
    const pageColumns = [];
    
    // Column 1: Special content on first page
    if (isFirstPage) {
      // Fill column 1 without grid (hidden for now)
      const column1Result = fillColumn(remainingAnswers, maxPageHeight);
      const column1Content = createAnswerColumnContent(column1Result.columnProblems);
      
      remainingAnswers = column1Result.remaining;
      
      if (column1Content.length > 0) {
        pageColumns.push({
          width: 165,
          stack: column1Content
        });
      }
      
      isFirstPage = false;
    } else {
      // Regular column 1 for subsequent pages
      const column1Result = fillColumn(remainingAnswers, maxPageHeight);
      const column1Content = createAnswerColumnContent(column1Result.columnProblems);
      
      remainingAnswers = column1Result.remaining;
      
      if (column1Content.length > 0) {
        pageColumns.push({
          width: 165,
          stack: column1Content
        });
      }
    }
    
    // Column 2
    const column2Result = fillColumn(remainingAnswers, maxPageHeight);
    const column2Content = createAnswerColumnContent(column2Result.columnProblems);
    
    remainingAnswers = column2Result.remaining;
    
    if (column2Content.length > 0) {
      pageColumns.push({
        width: 165,
        stack: column2Content
      });
    }
    
    // Column 3
    const column3Result = fillColumn(remainingAnswers, maxPageHeight);
    const column3Content = createAnswerColumnContent(column3Result.columnProblems);
    
    remainingAnswers = column3Result.remaining;
    
    if (column3Content.length > 0) {
      pageColumns.push({
        width: 165,
        stack: column3Content
      });
    }
    
    // Add page if there are columns
    if (pageColumns.length > 0) {
      pages.push({
        columns: pageColumns,
        columnGap: 10,
        margin: [0, 0, 0, 0]
      });
    }
    
    // Add page break if there are more answers
    if (remainingAnswers.length > 0) {
      pages.push({ pageBreak: 'after', text: '' });
    }
  }
  
  return pages;
}

export async function createWorksheetDocDefinitionClient(
  images: string[], 
  base64Images: string[]
) {
  // Use new column-based layout system
  const content = await createColumnBasedLayoutClient(images, base64Images);
  
  return {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 30],
    footer: createFooterClient,
    content: [
      // Header with title and creator (commented out for now)
      // {
      //   text: title || "Worksheet",
      //   fontSize: 24,
      //   bold: true,
      //   alignment: 'center',
      //   margin: [0, 0, 0, 20]
      // },
      // {
      //   text: `Created by: ${creator || "Teacher"}`,
      //   fontSize: 12,
      //   alignment: 'center',
      //   color: '#666666',
      //   margin: [0, 0, 0, 30]
      // },
      ...content
    ]
  };
}

// New function to create worksheet with answers
export async function createWorksheetWithAnswersDocDefinitionClient(
  problemImages: string[], 
  base64ProblemImages: string[],
  answerImages: string[],
  base64AnswerImages: string[]
) {
  // Create problem pages
  const problemContent = await createColumnBasedLayoutClient(problemImages, base64ProblemImages);
  
  // Create answer pages
  const answerContent = await createAnswerPagesClient(answerImages, base64AnswerImages);
  
  const allContent: unknown[] = [...problemContent];
  
  // Add page break before answers if there are answers
  if (answerContent.length > 0) {
    allContent.push({ pageBreak: 'after', text: '' });
    allContent.push(...answerContent);
  }
  
  return {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 30],
    footer: createFooterClient,
    defaultStyle: {
      font: 'CrimsonText'
    },
    content: allContent
  };
}

export async function generatePdfClient(docDefinition: unknown): Promise<Blob> {
  // Ensure pdfMake is loaded before generating PDF
  const pdfMakeInstance = await loadPdfMake();
  
  return new Promise((resolve, reject) => {
    try {
      if (!pdfMakeInstance) {
        reject(new Error('pdfMake not loaded'));
        return;
      }
      pdfMakeInstance.createPdf(docDefinition).getBlob((blob: Blob) => {
        resolve(blob);
      });
    } catch (error) {
      reject(error);
    }
  });
}
