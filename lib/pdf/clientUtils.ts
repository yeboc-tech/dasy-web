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
              
              // Configure CrimsonText, ONEMobile, and GmarketSans fonts since they're available in VFS
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
                },
                ONEMobileTitle: {
                  normal: 'ONE Mobile Title.ttf',
                  bold: 'ONE Mobile Bold.ttf',
                  italics: 'ONE Mobile Title.ttf',
                  bolditalics: 'ONE Mobile Bold.ttf'
                },
                GmarketSans: {
                  normal: 'GmarketSansTTFMedium.ttf',
                  bold: 'GmarketSansTTFBold.ttf',
                  italics: 'GmarketSansTTFMedium.ttf',
                  bolditalics: 'GmarketSansTTFBold.ttf'
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
    
    img.onerror = function() {
      // Silently fall back to placeholder image to avoid console noise during loading
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

// Calculate header height (title row + metadata row + border + margins)
function getHeaderHeight(): number {
  const titleRowHeight = 20; // fontSize 20
  const titleBottomMargin = 20;
  const metadataRowHeight = 55 + 11.25; // 55 top margin + 11.25 fontSize for bottom text
  const metadataBottomMargin = 20;
  const borderBottomMargin = 20;
  
  return titleRowHeight + titleBottomMargin + metadataRowHeight + metadataBottomMargin + borderBottomMargin; // ~146 points
}

// Calculate available height per page for problems
function getAvailablePageHeight(): number {
  const pageHeight = 842; // A4 height in points
  const topMargin = 60;
  const bottomMargin = 30;
  const footerHeight = 30; // Space for footer
  
  return pageHeight - topMargin - bottomMargin - footerHeight; // ~722 points
}

// Calculate available height for first page (with header)
function getFirstPageAvailableHeight(): number {
  const baseHeight = getAvailablePageHeight();
  const headerHeight = getHeaderHeight();
  
  return baseHeight - headerHeight; // ~576 points
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
  const firstPageHeight = getFirstPageAvailableHeight();
  
  // Step 3: Create problem objects with heights
  let remainingProblems = base64Images.map((image, index) => ({
    image,
    height: imageHeights[index],
    index
  }));
  
  const pages = [];
  let isFirstPage = true;
  
  // Step 4: Fill pages column by column
  while (remainingProblems.length > 0) {
    // Use reduced height for first page (has header), normal height for subsequent pages
    const currentPageHeight = isFirstPage ? firstPageHeight : maxPageHeight;
    
    // Fill left column
    const leftColumnResult = fillColumn(remainingProblems, currentPageHeight);
    const leftColumnContent = createColumnContent(leftColumnResult.columnProblems, currentPageHeight);
    
    remainingProblems = leftColumnResult.remaining;
    
    // Fill right column
    const rightColumnResult = fillColumn(remainingProblems, currentPageHeight);
    const rightColumnContent = createColumnContent(rightColumnResult.columnProblems, currentPageHeight);
    
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
    
    // After first page, subsequent pages don't have headers
    isFirstPage = false;
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
  const firstPageHeight = getFirstPageAvailableHeight();
  
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
    
    // Use reduced height for first page (has header), normal height for subsequent pages
    const currentPageHeight = isFirstPage ? firstPageHeight : maxPageHeight;
    
    // Column 1: Special content on first page
    if (isFirstPage) {
      // Fill column 1 without grid (hidden for now)
      const column1Result = fillColumn(remainingAnswers, currentPageHeight);
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
      const column1Result = fillColumn(remainingAnswers, currentPageHeight);
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
    const column2Result = fillColumn(remainingAnswers, currentPageHeight);
    const column2Content = createAnswerColumnContent(column2Result.columnProblems);
    
    remainingAnswers = column2Result.remaining;
    
    if (column2Content.length > 0) {
      pageColumns.push({
        width: 165,
        stack: column2Content
      });
    }
    
    // Column 3
    const column3Result = fillColumn(remainingAnswers, currentPageHeight);
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
    pageMargins: [40, 30, 40, 30],
    footer: createFooterClient,
    content: [
      ...content
    ]
  };
}

// New function to create worksheet with answers
export async function createWorksheetWithAnswersDocDefinitionClient(
  problemImages: string[], 
  base64ProblemImages: string[],
  answerImages: string[],
  base64AnswerImages: string[],
  title?: string,
  creator?: string
) {
  // Create problem pages
  const problemContent = await createColumnBasedLayoutClient(problemImages, base64ProblemImages);
  
  // Create answer pages
  const answerContent = await createAnswerPagesClient(answerImages, base64AnswerImages);
  
  const allContent: unknown[] = [];
  
  // Add header to first page
  // Load logo and QR code directly from public path
  const [logoBase64, qrBase64] = await Promise.all([
    new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = function() {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            console.error('Cannot get canvas context for logo');
            resolve('');
            return;
          }
          
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);
          
          const base64 = canvas.toDataURL('image/jpeg');
          resolve(base64);
        } catch (error) {
          console.error('Error converting logo to base64:', error);
          resolve('');
        }
      };
      
      img.onerror = function(error) {
        console.error('Failed to load logo:', error);
        resolve('');
      };
      
      img.src = '/images/minlab_logo.jpeg';
    }),
    new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = function() {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            console.error('Cannot get canvas context for QR code');
            resolve('');
            return;
          }
          
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);
          
          const base64 = canvas.toDataURL('image/png');
          resolve(base64);
        } catch (error) {
          console.error('Error converting QR code to base64:', error);
          resolve('');
        }
      };
      
      img.onerror = function(error) {
        console.error('Failed to load QR code:', error);
        resolve('');
      };
      
      img.src = '/images/textbook_qr_code.png';
    })
  ]);

  // Get current date in Korean format
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateString = `${year}.${month}.${day}`;
  
  // Create subtitle with dynamic info
  const problemCount = base64ProblemImages.length;

  // Row 1: Header with title and logo
  allContent.push({
    columns: [
      {
        text: "통합사회",
        fontSize: 20,
        font: 'ONEMobileTitle',
        color: '#FF00A1',
        alignment: 'left',
        width: '*'
      },
      ...(logoBase64 ? [{
        image: logoBase64,
        width: 111,
        alignment: 'right'
      }] : [])
    ],
    margin: [0, 0, 0, 8]
  });
  
  // Add worksheet title below if provided
  if (title) {
    allContent.push({
      text: title,
      fontSize: 16,
      font: 'ONEMobileTitle',
      color: '#6A6A6A',
      alignment: 'left',
      margin: [0, 0, 0, 20]
    });
  } else {
    // Add spacing if no title
    allContent.push({
      text: '',
      margin: [0, 0, 0, 12]
    });
  }

  // Row 2: Metadata and QR section with justify-between layout
  allContent.push({
    columns: [
      {
        text: `${dateString} | ${problemCount}문제 | ${creator || ''} | 이름 _______________`,
        fontSize: 9,
        font: 'GmarketSans',
        color: '#888888',
        alignment: 'left',
        margin: [0, 55, 0, 0], // Increased to align with QR group bottom
        width: 'auto'
      },
      {
        text: '', // Empty spacer to push QR section to right
        width: '*'
      },
      ...(qrBase64 ? [{
        table: {
          body: [
            [
              {
                text: "자세한 통합사회 ▶",
                fontSize: 7,
                font: 'GmarketSans',
                color: '#666666',
                alignment: 'right',
                border: [false, false, false, false],
                margin: [15, 37, 0, 0] // Left margin 15 to move right, top margin 37 for vertical alignment
              },
              {
                image: qrBase64,
                width: 45,
                alignment: 'right',
                border: [false, false, false, false],
                margin: [0, 0, 0, 0]
              }
            ],
            [
              {
                text: "수능과 내신을 한권에 담다",
                fontSize: 11.25, // 15px converted to points
                font: 'GmarketSans',
                color: '#666666',
                alignment: 'right',
                border: [false, false, false, false],
                colSpan: 2,
                margin: [0, 1, 0, 0] // Reduced top margin to minimize gap with QR
              },
              {}
            ]
          ]
        },
        layout: 'noBorders',
        width: 'auto'
      }] : [])
    ],
    columnGap: 0,
    margin: [0, 0, 0, 20] // Bottom margin for spacing with border
  });

  // Add bottom border for the whole header (mimicking footer style)
  allContent.push({
    canvas: [
      {
        type: 'line',
        x1: 0,
        y1: 0,
        x2: 595, // Full page width like footer
        y2: 0,
        lineWidth: 1, // Same as footer
        lineColor: '#e0e0e0' // Same color as footer
      }
    ],
    margin: [-40, 0, 0, 20] // Negative left margin to start from dead left edge
  });
  
  // Add problem content
  allContent.push(...problemContent);
  
  // Add page break before answers if there are answers
  if (answerContent.length > 0) {
    allContent.push({ pageBreak: 'after', text: '' });
    
    // Add same header to answer pages first page
    // Row 1: Header with title and logo
    allContent.push({
      columns: [
        {
          text: "통합사회",
          fontSize: 20,
          font: 'ONEMobileTitle',
          color: '#FF00A1',
          alignment: 'left',
          width: '*'
        },
        ...(logoBase64 ? [{
          image: logoBase64,
          width: 111,
          alignment: 'right'
        }] : [])
      ],
      margin: [0, 0, 0, 8]
    });
    
    // Add worksheet title below if provided (answer pages)
    if (title) {
      allContent.push({
        text: title,
        fontSize: 16,
        font: 'ONEMobileTitle',
        color: '#6A6A6A',
        alignment: 'left',
        margin: [0, 0, 0, 20]
      });
    } else {
      // Add spacing if no title
      allContent.push({
        text: '',
        margin: [0, 0, 0, 12]
      });
    }

    // Row 2: Metadata and QR section with justify-between layout
    allContent.push({
      columns: [
        {
          text: `${dateString} | ${problemCount}문제 | ${creator || ''} | 이름 _______________`,
          fontSize: 9,
          font: 'GmarketSans',
          color: '#888888',
          alignment: 'left',
          margin: [0, 55, 0, 0],
          width: 'auto'
        },
        {
          text: '', // Empty spacer
          width: '*'
        },
        ...(qrBase64 ? [{
          table: {
            body: [
              [
                {
                  text: "자세한 통합사회 ▶",
                  fontSize: 7,
                  font: 'GmarketSans',
                  color: '#666666',
                  alignment: 'right',
                  border: [false, false, false, false],
                  margin: [15, 37, 0, 0]
                },
                {
                  image: qrBase64,
                  width: 45,
                  alignment: 'right',
                  border: [false, false, false, false],
                  margin: [0, 0, 0, 0]
                }
              ],
              [
                {
                  text: "수능과 내신을 한권에 담다",
                  fontSize: 11.25,
                  font: 'GmarketSans',
                  color: '#666666',
                  alignment: 'right',
                  border: [false, false, false, false],
                  colSpan: 2,
                  margin: [0, 1, 0, 0]
                },
                {}
              ]
            ]
          },
          layout: 'noBorders',
          width: 'auto'
        }] : [])
      ],
      columnGap: 0,
      margin: [0, 0, 0, 20]
    });

    // Add border line
    allContent.push({
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 595, // Full page width like footer
          y2: 0,
          lineWidth: 1, // Same as footer
          lineColor: '#e0e0e0' // Same color as footer
        }
      ],
      margin: [-40, 0, 0, 20] // Negative left margin to start from dead left edge
    });
    
    allContent.push(...answerContent);
  }
  
  return {
    pageSize: "A4",
    pageMargins: [40, 30, 40, 30],
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
