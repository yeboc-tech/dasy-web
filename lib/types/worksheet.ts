export interface WorksheetRequest {
  title: string;
  creator: string;
  images: string[];
}

export interface PdfDocumentDefinition {
  pageSize: string;
  pageMargins: number[];
  footer: (currentPage: number, pageCount: number) => any[];
  content: any[];
}

// Client-side specific types
export interface ClientPdfOptions {
  title?: string;
  creator?: string;
  images: string[];
}

export interface PdfGenerationResult {
  blob: Blob;
  url: string;
} 