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

// Cache for static assets (logo, QR code)
let cachedLogoBase64: string | null = null;
let cachedQrBase64: string | null = null;

// Result type for imageToBase64WithDimensions
export interface ImageWithDimensions {
  base64: string;
  width: number;
  height: number;
}

/**
 * Preload pdfMake library early to avoid delay during PDF generation.
 * Call this on page mount to start loading in background.
 */
export function preloadPdfMake(): void {
  if (pdfMake && fontsLoaded) return;
  // Start loading in background (don't await)
  loadPdfMake().catch(() => {
    // Silently ignore preload errors - will retry during actual generation
  });
}

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

export async function imageToBase64Client(
  imagePath: string,
  cropOptions?: { maxHeight?: number }
): Promise<string> {
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

        // Calculate crop dimensions if maxHeight is specified
        let sourceHeight = img.naturalHeight;
        let shouldCrop = false;

        if (cropOptions?.maxHeight && img.naturalHeight > cropOptions.maxHeight) {
          // Image exceeds max height, crop from bottom
          const aspectRatio = img.naturalWidth / img.naturalHeight;
          sourceHeight = cropOptions.maxHeight;
          shouldCrop = true;

          console.log(`[Image Crop] Image exceeds max height. Original: ${img.naturalHeight}px, Cropped to: ${sourceHeight}px`);
        }

        // Set canvas size
        canvas.width = img.naturalWidth;
        canvas.height = sourceHeight;

        // Draw image (cropped if necessary)
        if (shouldCrop) {
          // Draw only the top portion of the image
          ctx.drawImage(
            img,
            0, 0, img.naturalWidth, sourceHeight,  // source: full width, cropped height from top
            0, 0, img.naturalWidth, sourceHeight   // dest: match canvas
          );
        } else {
          // Draw full image
          ctx.drawImage(img, 0, 0);
        }

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

/**
 * Convert image to base64 AND return dimensions in a single load.
 * This eliminates the need for a separate getAllImageHeights() call.
 *
 * @param imagePath - URL of the image to convert
 * @param cropOptions - Optional cropping options (maxHeight)
 * @param fixedWidth - Width to scale the image to (for height calculation)
 * @param maxPixelWidth - Optional: Scale down images larger than this width (undefined = keep original size)
 * @returns Promise<ImageWithDimensions> - { base64, width, height }
 */
export async function imageToBase64WithDimensions(
  imagePath: string,
  cropOptions?: { maxHeight?: number },
  fixedWidth: number = 240,
  maxPixelWidth?: number // Optional: undefined = full resolution (current behavior)
): Promise<ImageWithDimensions> {
  return new Promise((resolve) => {
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(imagePath)}`;
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = function() {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          console.error('Cannot get canvas context');
          resolve({ base64: getNoImageBase64(), width: 300, height: 200 });
          return;
        }

        // Calculate source dimensions (with optional crop)
        let sourceHeight = img.naturalHeight;
        let shouldCrop = false;

        if (cropOptions?.maxHeight && img.naturalHeight > cropOptions.maxHeight) {
          sourceHeight = cropOptions.maxHeight;
          shouldCrop = true;
        }

        // Calculate target dimensions (with optional scaling)
        let targetWidth = img.naturalWidth;
        let targetHeight = sourceHeight;
        let shouldScale = false;

        if (maxPixelWidth && img.naturalWidth > maxPixelWidth) {
          const scale = maxPixelWidth / img.naturalWidth;
          targetWidth = maxPixelWidth;
          targetHeight = Math.round(sourceHeight * scale);
          shouldScale = true;
          console.log(`📉 [Image Scale] ${img.naturalWidth}×${sourceHeight} → ${targetWidth}×${targetHeight}`);
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Draw image
        if (shouldScale || shouldCrop) {
          ctx.drawImage(
            img,
            0, 0, img.naturalWidth, sourceHeight,  // source (cropped if needed)
            0, 0, targetWidth, targetHeight         // destination (scaled if needed)
          );
        } else {
          ctx.drawImage(img, 0, 0);
        }

        const base64 = canvas.toDataURL('image/png');

        // Calculate scaled height based on fixedWidth (for PDF layout)
        const aspectRatio = targetHeight / targetWidth;
        const scaledHeight = fixedWidth * aspectRatio;

        resolve({
          base64,
          width: targetWidth,
          height: scaledHeight // This is the height at fixedWidth scale
        });
      } catch (error) {
        console.error('Error converting image to base64 with dimensions:', error);
        resolve({ base64: getNoImageBase64(), width: 300, height: 200 });
      }
    };

    img.onerror = function() {
      resolve({ base64: getNoImageBase64(), width: 300, height: 200 });
    };

    img.src = proxyUrl;
  });
}

/**
 * Load and cache logo image (singleton pattern)
 */
export async function getCachedLogoBase64(): Promise<string> {
  if (cachedLogoBase64) return cachedLogoBase64;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = function() {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve('');
          return;
        }

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);

        cachedLogoBase64 = canvas.toDataURL('image/jpeg');
        resolve(cachedLogoBase64);
      } catch (error) {
        console.error('Error caching logo:', error);
        resolve('');
      }
    };

    img.onerror = () => resolve('');
    img.src = '/images/minlab_logo.jpeg';
  });
}

/**
 * Load and cache QR code image (singleton pattern)
 */
export async function getCachedQrBase64(): Promise<string> {
  if (cachedQrBase64) return cachedQrBase64;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = function() {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve('');
          return;
        }

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);

        cachedQrBase64 = canvas.toDataURL('image/png');
        resolve(cachedQrBase64);
      } catch (error) {
        console.error('Error caching QR code:', error);
        resolve('');
      }
    };

    img.onerror = () => resolve('');
    img.src = '/images/textbook_qr_code.png';
  });
}

// Helper function to crop a base64 image from the bottom
export async function cropBase64ImageClient(
  base64Image: string,
  maxHeight: number
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = function() {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          console.error('Cannot get canvas context for cropping');
          resolve(base64Image); // Return original if crop fails
          return;
        }

        // Check if image exceeds max height
        if (img.naturalHeight <= maxHeight) {
          // No cropping needed
          resolve(base64Image);
          return;
        }

        // Image exceeds max height, crop from bottom
        const sourceHeight = maxHeight;
        console.log(`[Base64 Crop] Image exceeds max height. Original: ${img.naturalHeight}px, Cropped to: ${sourceHeight}px`);

        // Set canvas size to cropped dimensions
        canvas.width = img.naturalWidth;
        canvas.height = sourceHeight;

        // Draw only the top portion of the image
        ctx.drawImage(
          img,
          0, 0, img.naturalWidth, sourceHeight,  // source: full width, cropped height from top
          0, 0, img.naturalWidth, sourceHeight   // dest: match canvas
        );

        // Convert to base64
        const croppedBase64 = canvas.toDataURL('image/png');
        resolve(croppedBase64);
      } catch (error) {
        console.error('Error cropping base64 image:', error);
        resolve(base64Image); // Return original if crop fails
      }
    };

    img.onerror = function() {
      console.error('Failed to load base64 image for cropping');
      resolve(base64Image); // Return original if load fails
    };

    img.src = base64Image;
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
  const topMargin = 60; // Original value - accounts for page content positioning
  const bottomMargin = 30;
  const footerHeight = 30; // Space for footer

  return pageHeight - topMargin - bottomMargin - footerHeight; // ~722 points
}

// Calculate available height per page for answers (more aggressive packing)
function getAvailableAnswerPageHeight(): number {
  const pageHeight = 842; // A4 height in points
  const topMargin = 25; // Tighter top margin for answers
  const bottomMargin = 25; // Tighter bottom margin
  const footerHeight = 12; // Minimal footer space

  return pageHeight - topMargin - bottomMargin - footerHeight; // ~780 points
}

// Calculate available height for first page (with header)
function getFirstPageAvailableHeight(): number {
  const baseHeight = getAvailablePageHeight();
  const headerHeight = getHeaderHeight();

  return baseHeight - headerHeight; // ~616 points
}

// Calculate available height for first answer page (with header, tighter packing)
function getFirstAnswerPageAvailableHeight(): number {
  const baseHeight = getAvailableAnswerPageHeight();
  const headerHeight = getHeaderHeight();

  return baseHeight - headerHeight; // ~621 points
}

// Calculate the height of metadata badges for a problem (assuming 3 lines max)
function calculateBadgeHeight(problem: { metadata?: Record<string, unknown> }): number {
  if (!problem.metadata) return 0;

  const metadata = problem.metadata;

  // Check if there are any badges
  const chapterLabels = metadata.tag_labels || metadata.tags || metadata.chapter_path;
  const hasChapterLabels = Array.isArray(chapterLabels) && chapterLabels.length > 0;
  const hasProblemType = typeof metadata.problem_type === 'string';
  const hasDifficulty = typeof metadata.difficulty === 'string';
  const correctRate = metadata.correct_rate ?? metadata.accuracy_rate;
  const hasCorrectRate = typeof correctRate === 'number';

  const isEconomyProblem = !!(metadata.tag_labels || metadata.tags);
  const hasRelatedSubjects = !isEconomyProblem && Array.isArray(metadata.related_subjects) && metadata.related_subjects.length > 0;

  const hasBadges = hasChapterLabels || hasProblemType || hasDifficulty || hasCorrectRate || hasRelatedSubjects;

  if (!hasBadges) return 0;

  // Assume 3 lines max (conservative to prevent overflow):
  // line1 (7pt) + gap (2pt) + line2 (7pt) + gap (2pt) + line3 (7pt) + bottom margin (8pt)
  return 7 + 2 + 7 + 2 + 7 + 8; // = 33pt
}

// Fill a column with problems until height limit is reached
function fillColumn(
  problems: Array<{ image: string; height: number; index: number; metadata?: Record<string, unknown> }>,
  maxHeight: number
): { columnProblems: Array<{ image: string; height: number; index: number; metadata?: Record<string, unknown> }>; remaining: Array<{ image: string; height: number; index: number; metadata?: Record<string, unknown> }> } {
  const columnProblems = [];
  let currentHeight = 0;
  let i = 0;

  while (i < problems.length) {
    const problem = problems[i];
    const numberingHeight = 17; // Height for numbering text (fontSize 12 + margin 5)
    const badgeHeight = calculateBadgeHeight(problem); // Badge height (includes 8pt bottom margin)
    const minGap = 15; // Minimum gap between problems
    const problemHeightWithMargin = problem.height + numberingHeight + badgeHeight + minGap;

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

// Fill a column with answers until height limit is reached (optimized for answer layout)
function fillAnswerColumn(
  answers: Array<{ image: string; height: number; index: number }>,
  maxHeight: number
): { columnProblems: Array<{ image: string; height: number; index: number }>; remaining: Array<{ image: string; height: number; index: number }> } {
  const columnProblems = [];
  let currentHeight = 0;
  let i = 0;

  while (i < answers.length) {
    const answer = answers[i];
    // Tight spacing for answers
    const numberingHeight = 11; // fontSize 10 + minimal margin
    const minGap = 5; // Minimal gap between answers

    // Base height without gap
    const baseHeight = answer.height + numberingHeight;

    // Check if adding this answer would exceed height limit
    if (currentHeight + baseHeight > maxHeight && columnProblems.length > 0) {
      break;
    }

    columnProblems.push(answer);
    // Add height with gap
    currentHeight += baseHeight + minGap;
    i++;
  }

  return {
    columnProblems,
    remaining: answers.slice(i)
  };
}

// Helper function to create metadata badges for pdfMake (auto-wrap all badges)
function createMetadataBadges(problem: { metadata?: Record<string, unknown> }) {
  if (!problem.metadata) return [];

  const metadata = problem.metadata;
  const allBadges: Array<{ text: string; fontSize: number; font?: string; color?: string; background?: string }> = [];

  // Helper to create a badge with gray background
  const createBadge = (text: string) => ({
    text: text,
    fontSize: 7,
    font: 'GmarketSans',
    color: '#374151',
    background: '#f3f4f6'
  });

  // Helper to add badge with center dot separator
  const addBadge = (text: string) => {
    if (allBadges.length > 0) {
      allBadges.push({
        text: '  ·  ',
        fontSize: 7,
        background: '#f3f4f6' // Same gray background for continuous appearance
      });
    }
    allBadges.push(createBadge(text));
  };

  // Detect economy vs 통합사회 by checking if chapter_path exists
  // 통합사회 problems have chapter_path enriched, economy problems don't
  const isEconomyProblem = !metadata.chapter_path;

  // For economy: use tag_labels/tags, for 통합사회: use chapter_path
  const chapterLabels = isEconomyProblem
    ? (metadata.tag_labels || metadata.tags)
    : metadata.chapter_path;

  // 1. Add chapter hierarchy badges
  if (Array.isArray(chapterLabels) && chapterLabels.length > 0) {
    chapterLabels.forEach((label: unknown) => {
      if (typeof label === 'string') {
        addBadge(label);
      }
    });
  }

  // 2. Problem type
  if (typeof metadata.problem_type === 'string') {
    addBadge(metadata.problem_type);
  }

  // 3. Difficulty
  if (typeof metadata.difficulty === 'string') {
    addBadge(metadata.difficulty);
  }

  // 4. Related subjects (only for 통합사회)
  if (!isEconomyProblem && Array.isArray(metadata.related_subjects) && metadata.related_subjects.length > 0) {
    metadata.related_subjects.forEach((subject: unknown) => {
      if (typeof subject === 'string') {
        addBadge(subject);
      }
    });
  }

  // 5. Correct rate
  const correctRate = metadata.correct_rate ?? metadata.accuracy_rate;
  if (typeof correctRate === 'number') {
    addBadge(`정답률 ${correctRate}%`);
  }

  // 6. Exam year (if available)
  if (typeof metadata.exam_year === 'number') {
    addBadge(`${metadata.exam_year}년`);
  }

  // 7. Add tags (topic-level descriptors) - ONLY for 통합사회 problems, at the end
  // Economy problems already have their hierarchy in tag_labels, so skip tags for them
  if (!isEconomyProblem && Array.isArray(metadata.tags) && metadata.tags.length > 0) {
    metadata.tags.forEach((tag: unknown) => {
      if (typeof tag === 'string') {
        addBadge(tag);
      }
    });
  }

  if (allBadges.length === 0) return [];

  // Return as single wrapping block
  return [{
    text: allBadges,
    margin: [0, 0, 0, 8] // Bottom margin before image
  }];
}

// Create column content with space-between distribution
function createColumnContent(columnProblems: Array<{ image: string; height: number; index: number; metadata?: Record<string, unknown> }>, maxHeight: number) {
  if (columnProblems.length === 0) return [];
  if (columnProblems.length === 1) {
    const badges = createMetadataBadges(columnProblems[0]);
    return [{
      stack: [
        {
          text: `${columnProblems[0].index + 1}.`,
          fontSize: 12,
          bold: true,
          alignment: 'left',
          margin: [0, 0, 0, 5]
        },
        ...badges,
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
  const totalProblemHeight = columnProblems.reduce((sum, p) => {
    const badgeHeight = calculateBadgeHeight(p);
    return sum + p.height + 17 + badgeHeight; // 17pt = number (fontSize 12 + margin 5)
  }, 0);
  const availableSpaceForMargins = maxHeight - totalProblemHeight;
  const spaceBetweenProblems = Math.max(15, availableSpaceForMargins / (columnProblems.length - 1));
  

  return columnProblems.map((problem, index) => {
    const badges = createMetadataBadges(problem);
    return {
      stack: [
        {
          text: `${problem.index + 1}.`,
          fontSize: 12,
          bold: true,
          alignment: 'left',
          font: 'CrimsonTextSemiBold',
          margin: [0, 0, 0, 5]
        },
        ...badges,
        {
          image: problem.image,
          width: 240,
          alignment: 'center',
          margin: [0, 0, 0, 0]
        }
      ],
      unbreakable: true,
      margin: index === columnProblems.length - 1 ? [0, 0, 0, 0] : [0, 0, 0, spaceBetweenProblems]
    };
  });
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
        margin: [0, 0, 0, 1] // Minimal margin between number and image
      },
      {
        image: problem.image,
        width: 165, // 1/3 of total problem area (495px / 3 = 165px)
        alignment: 'center',
        margin: [0, 0, 0, 0]
      }
    ],
    unbreakable: true,
    margin: index === columnProblems.length - 1 ? [0, 0, 0, 0] : [0, 0, 0, 5] // Minimal gap matching fillAnswerColumn
  }));
}

// New column-based layout system
export async function createColumnBasedLayoutClient(
  problems: string[],
  base64Images: string[],
  problemMetadata?: Array<Record<string, unknown>>,
  preCalculatedHeights?: number[] // Optional: skip getAllImageHeights if provided
) {
  // Step 1: Calculate all image heights (skip if pre-calculated)
  const imageHeights = preCalculatedHeights || await getAllImageHeights(base64Images);

  // Step 2: Get available page height
  const maxPageHeight = getAvailablePageHeight();
  const firstPageHeight = getFirstPageAvailableHeight();

  // Step 3: Create problem objects with heights and metadata
  let remainingProblems: Array<{ image: string; height: number; index: number; metadata?: Record<string, unknown> }> = base64Images.map((image, index) => ({
    image,
    height: imageHeights[index],
    index,
    metadata: problemMetadata?.[index]
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
  base64AnswerImages: string[],
  preCalculatedHeights?: number[] // Optional: skip getAllImageHeights if provided
) {
  if (answerImages.length === 0) return [];

  // Calculate image heights for answers (skip if pre-calculated)
  const answerHeights = preCalculatedHeights || await getAllImageHeights(base64AnswerImages, 165);

  // Get available page height for answers (uses tighter packing)
  const maxPageHeight = getAvailableAnswerPageHeight();
  const firstPageHeight = getFirstAnswerPageAvailableHeight();
  
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
      const column1Result = fillAnswerColumn(remainingAnswers, currentPageHeight);
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
      const column1Result = fillAnswerColumn(remainingAnswers, currentPageHeight);
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
    const column2Result = fillAnswerColumn(remainingAnswers, currentPageHeight);
    const column2Content = createAnswerColumnContent(column2Result.columnProblems);

    remainingAnswers = column2Result.remaining;

    if (column2Content.length > 0) {
      pageColumns.push({
        width: 165,
        stack: column2Content
      });
    }

    // Column 3
    const column3Result = fillAnswerColumn(remainingAnswers, currentPageHeight);
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
  base64Images: string[],
  createdAt?: string
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
  creator?: string,
  createdAt?: string,
  subject?: string, // Optional subject, defaults to "통합사회"
  problemMetadata?: Array<Record<string, unknown>>, // Optional problem metadata for badges
  preCalculatedProblemHeights?: number[], // Optional: skip image height calculation
  preCalculatedAnswerHeights?: number[] // Optional: skip answer height calculation
) {
  // Create problem pages (pass pre-calculated heights if available)
  const problemContent = await createColumnBasedLayoutClient(
    problemImages,
    base64ProblemImages,
    problemMetadata,
    preCalculatedProblemHeights
  );

  // Create answer pages (pass pre-calculated heights if available)
  const answerContent = await createAnswerPagesClient(
    answerImages,
    base64AnswerImages,
    preCalculatedAnswerHeights
  );
  
  const allContent: unknown[] = [];

  // Add header to first page
  // Load logo and QR code using cached functions (loaded once, reused)
  const [logoBase64, qrBase64] = await Promise.all([
    getCachedLogoBase64(),
    getCachedQrBase64()
  ]);

  // Get date in Korean format (use createdAt if provided, otherwise current date)
  const dateToUse = createdAt ? new Date(createdAt) : new Date();
  const year = dateToUse.getFullYear();
  const month = String(dateToUse.getMonth() + 1).padStart(2, '0');
  const day = String(dateToUse.getDate()).padStart(2, '0');
  const dateString = `${year}.${month}.${day}`;
  
  // Create subtitle with dynamic info
  const problemCount = base64ProblemImages.length;

  // Determine subject title (default to "통합사회" if not provided)
  const subjectTitle = subject || "통합사회";

  // Row 1: Header with title and logo
  allContent.push({
    columns: [
      {
        text: subjectTitle,
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
          text: subjectTitle,
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

// Progress callback type
export type PdfProgressCallback = (progress: {
  stage: 'fetching_images' | 'loading_library' | 'generating' | 'complete';
  percent: number;
  detail?: string;
}) => void;

/**
 * Generate PDF using Web Worker (non-blocking)
 * UI stays responsive during generation
 */
export function generatePdfWithWorker(
  docDefinition: unknown,
  onProgress?: PdfProgressCallback
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Create worker
    const worker = new Worker('/workers/pdfWorker.js');

    worker.onmessage = (e) => {
      const { type, stage, percent, blob, message } = e.data;

      if (type === 'progress') {
        onProgress?.({ stage, percent });
      } else if (type === 'complete') {
        worker.terminate();
        resolve(blob);
      } else if (type === 'error') {
        worker.terminate();
        reject(new Error(message));
      }
    };

    worker.onerror = (error) => {
      worker.terminate();
      reject(new Error(`Worker error: ${error.message}`));
    };

    // Remove footer function before sending (functions can't be cloned)
    // The worker will add its own footer function
    const serializableDocDef = { ...(docDefinition as Record<string, unknown>) };
    delete serializableDocDef.footer;

    // Start generation
    worker.postMessage({ type: 'generate', docDefinition: serializableDocDef });
  });
}
