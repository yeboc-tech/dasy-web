'use client';

interface SettingsPanelProps {
  selectedImages: string[];
}

export default function SettingsPanel({ selectedImages }: SettingsPanelProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Settings</h2>
      <div className="text-sm text-gray-600">
        {selectedImages.length} images selected
      </div>
      <div className="border rounded-lg p-4 bg-gray-50">
        <p className="text-sm text-gray-500">
          PDF settings and configuration will be implemented here.
        </p>
      </div>
    </div>
  );
}
