// PDF Generation Web Worker
// This runs in a separate thread so UI doesn't freeze

let pdfMake = null;

// Load pdfMake library
async function loadPdfMake() {
  if (pdfMake) return pdfMake;

  // Import pdfMake from CDN
  importScripts('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js');

  // Load fonts VFS - importScripts works synchronously in workers
  importScripts('/fonts/vfs_fonts.js');

  // Configure pdfMake
  if (self.pdfMake) {
    pdfMake = self.pdfMake;

    // Assign VFS (virtual file system with fonts) - check both self.vfs and global vfs
    const vfsData = self.vfs || (typeof vfs !== 'undefined' ? vfs : null);
    if (vfsData) {
      pdfMake.vfs = vfsData;
    }

    // Configure custom fonts
    pdfMake.fonts = {
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
  }

  return pdfMake;
}

// Footer function (must be defined in worker since functions can't be sent via postMessage)
function createFooter(currentPage) {
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

// Handle messages from main thread
self.onmessage = async function(e) {
  const { type, docDefinition } = e.data;

  // Warmup: just load pdfMake library in background
  if (type === 'warmup') {
    try {
      await loadPdfMake();
      console.log('[PDF Worker] Warmup complete - pdfMake loaded');
    } catch (err) {
      console.warn('[PDF Worker] Warmup failed:', err);
    }
    return;
  }

  if (type === 'generate') {
    try {
      // Report: Loading library (may already be loaded from warmup)
      self.postMessage({ type: 'progress', stage: 'loading_library', percent: 0 });

      await loadPdfMake();

      // Report: Generating PDF
      self.postMessage({ type: 'progress', stage: 'generating', percent: 10 });

      if (!pdfMake) {
        throw new Error('pdfMake not loaded');
      }

      // Add footer function (can't be sent via postMessage, so we add it here)
      docDefinition.footer = createFooter;

      // Generate PDF
      const pdfDoc = pdfMake.createPdf(docDefinition);

      // Get blob
      pdfDoc.getBlob((blob) => {
        // Report: Complete
        self.postMessage({ type: 'progress', stage: 'complete', percent: 100 });
        self.postMessage({ type: 'complete', blob });
      });

    } catch (error) {
      self.postMessage({ type: 'error', message: error.message });
    }
  }
};
