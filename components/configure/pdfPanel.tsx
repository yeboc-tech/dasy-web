'use client';

interface PdfPanelProps {
  selectedImages: string[];
}

export default function PdfPanel({ selectedImages }: PdfPanelProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">PDF Preview</h2>
      <div className="text-sm text-gray-600">
        {selectedImages.length} images selected for PDF generation
      </div>
      <div className="border rounded-lg p-4 bg-gray-50">
        <p className="text-sm text-gray-500">
          PDF generation functionality will be implemented here.
        </p>
      </div>
    </div>
  );
}
