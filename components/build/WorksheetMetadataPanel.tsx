'use client';

import { useState, useEffect, useRef } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GripVertical, Plus, X, Upload, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { getCdnUrl } from '@/lib/utils/s3Utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  SortField,
  SortRule,
  SortPreset,
  SORT_FIELD_LABELS,
  TONGHAP_PRESET_RULES,
  ECONOMY_PRESET_RULES,
  getMatchingPreset,
  TONGHAP_SORT_FIELDS,
  ECONOMY_SORT_FIELDS,
} from '@/lib/types/sorting';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable item component
interface SortableItemProps {
  id: string;
  rule: SortRule;
  index: number;
  availableFieldsForDropdown: SortField[]; // Fields available to select (current + unused from mode-specific list)
  onFieldChange: (index: number, field: SortField) => void;
  onDirectionChange: (index: number, checked: boolean) => void;
  onRemove: (index: number) => void;
}

function SortableItem({ id, rule, index, availableFieldsForDropdown, onFieldChange, onDirectionChange, onRemove }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between gap-2 p-2 border border-gray-200 rounded-md bg-white"
    >
      {/* Left side: Drag handle + Field selector */}
      <div className="flex items-center gap-2">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="p-0.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing flex-shrink-0"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Field selector */}
        <Select
          value={rule.field}
          onValueChange={(value) => onFieldChange(index, value as SortField)}
        >
          <SelectTrigger className="w-[140px] h-8 border-gray-200 shadow-none cursor-pointer">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white">
            {availableFieldsForDropdown.filter(f => f !== 'random' && f !== 'manual').map((field) => (
              <SelectItem key={field} value={field} className="cursor-pointer hover:bg-gray-100">
                {SORT_FIELD_LABELS[field as Exclude<SortField, 'random' | 'manual'>]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Right side: Direction toggle + Remove button */}
      <div className="flex items-center gap-2">
        {/* Direction toggle */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xs text-gray-500">
            {rule.direction === 'asc' ? '오름차순' : '내림차순'}
          </span>
          <Switch
            checked={rule.direction === 'desc'}
            onCheckedChange={(checked) => onDirectionChange(index, checked)}
            className="data-[state=checked]:bg-black data-[state=unchecked]:bg-gray-200 data-[state=checked]:!border-black data-[state=unchecked]:!border-gray-200 h-[1.15rem] w-8 border shadow-sm [&>span]:bg-white [&>span]:data-[state=checked]:translate-x-[calc(100%-2px)]"
          />
        </div>

        {/* Remove button */}
        <button
          onClick={() => onRemove(index)}
          className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface WorksheetMetadataPanelProps {
  title: string;
  setTitle: (value: string) => void;
  author: string;
  setAuthor: (value: string) => void;
  sortRules: SortRule[];
  setSortRules: (rules: SortRule[]) => void;
  isTaggedMode: boolean;
  errors?: {
    title?: string;
    author?: string;
  };
  readOnly?: boolean;
  // Thumbnail props (path stored in DB, construct full URL with getCdnUrl)
  thumbnailPath: string | null;
  thumbnailFile: File | null;
  onThumbnailChange: (file: File | null) => void;
}

export default function WorksheetMetadataPanel({
  title,
  setTitle,
  author,
  setAuthor,
  sortRules,
  setSortRules,
  isTaggedMode,
  errors,
  readOnly = false,
  thumbnailPath,
  thumbnailFile,
  onThumbnailChange,
}: WorksheetMetadataPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  // Generate preview when file changes
  useEffect(() => {
    if (thumbnailFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(thumbnailFile);
    } else {
      setThumbnailPreview(null);
    }
  }, [thumbnailFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        alert('PNG 또는 JPG 파일만 업로드할 수 있습니다.');
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('파일 크기는 10MB 이하여야 합니다.');
        return;
      }
      onThumbnailChange(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveThumbnail = () => {
    onThumbnailChange(null);
  };

  // Display URL: preview (local file) > full URL from path (saved)
  const displayUrl = thumbnailPreview || (thumbnailPath ? getCdnUrl(thumbnailPath) : null);
  // Internal IDs for drag-and-drop stability (derived from sortRules prop)
  const [internalIds, setInternalIds] = useState<Map<number, string>>(new Map());

  // Derive sortRulesWithIds from props + internal IDs
  const sortRulesWithIds = (sortRules || []).map((rule, index) => ({
    ...rule,
    id: internalIds.get(index) || `rule-${index}-${Date.now()}`
  }));

  // Sync internal IDs when sortRules changes externally
  useEffect(() => {
    const newIds = new Map<number, string>();
    (sortRules || []).forEach((_, index) => {
      newIds.set(index, internalIds.get(index) || `rule-${index}-${Date.now()}`);
    });
    setInternalIds(newIds);
  }, [(sortRules || []).length]);

  // Derive active preset from current rules
  const activePreset = getMatchingPreset(sortRules || [], isTaggedMode);

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortRulesWithIds.findIndex(item => item.id === active.id);
      const newIndex = sortRulesWithIds.findIndex(item => item.id === over.id);
      const reordered = arrayMove(sortRules, oldIndex, newIndex);
      setSortRules(reordered);

      // Update internal IDs to match new order
      const newIds = new Map<number, string>();
      const reorderedWithIds = arrayMove(sortRulesWithIds, oldIndex, newIndex);
      reorderedWithIds.forEach((rule, index) => {
        newIds.set(index, rule.id);
      });
      setInternalIds(newIds);
    }
  };

  const handlePresetClick = (preset: SortPreset) => {
    const presetRules = isTaggedMode ? ECONOMY_PRESET_RULES : TONGHAP_PRESET_RULES;
    const modeFieldsList = (isTaggedMode ? ECONOMY_SORT_FIELDS : TONGHAP_SORT_FIELDS).filter(f => f !== 'random' && f !== 'manual');

    if (preset === '수동') {
      // Set manual marker for drag & drop mode
      setSortRules(presetRules['수동']);
      setInternalIds(new Map());
    } else if (preset === '무작위') {
      // Set random marker for shuffle
      setSortRules(presetRules['무작위']);
      setInternalIds(new Map());
    } else if (preset === '연습') {
      const newRules = presetRules['연습'];
      setSortRules(newRules);
      const newIds = new Map<number, string>();
      newRules.forEach((_, i) => {
        newIds.set(i, `preset-rule-${i}-${Date.now()}`);
      });
      setInternalIds(newIds);
    } else if (preset === '커스텀') {
      // 커스텀: set to one item (first available field)
      const newRule: SortRule = { field: modeFieldsList[0], direction: 'asc' };
      setSortRules([newRule]);
      const newIds = new Map<number, string>();
      newIds.set(0, `custom-rule-${Date.now()}`);
      setInternalIds(newIds);
    }
  };

  // Get mode-specific fields and filter out already used ones (and 'random'/'manual' which are internal-only)
  const modeFields = (isTaggedMode ? ECONOMY_SORT_FIELDS : TONGHAP_SORT_FIELDS).filter(f => f !== 'random' && f !== 'manual');
  const usedFields = (sortRules || []).map(r => r.field).filter(f => f !== 'random' && f !== 'manual');
  const availableFields = modeFields.filter(field => !usedFields.includes(field));

  const handleAddRule = () => {
    if (availableFields.length === 0) return;

    const newRule: SortRule = { field: availableFields[0], direction: 'asc' };
    const newRules = [...sortRules, newRule];
    setSortRules(newRules);
    const newIds = new Map(internalIds);
    newIds.set(newRules.length - 1, `rule-${Date.now()}`);
    setInternalIds(newIds);
  };

  const handleRemoveRule = (index: number) => {
    const newRules = sortRules.filter((_, i) => i !== index);
    setSortRules(newRules);
    // Rebuild internal IDs
    const newIds = new Map<number, string>();
    sortRulesWithIds
      .filter((_, i) => i !== index)
      .forEach((rule, newIndex) => {
        newIds.set(newIndex, rule.id);
      });
    setInternalIds(newIds);
  };

  const handleFieldChange = (index: number, field: SortField) => {
    const newRules = [...sortRules];
    newRules[index] = { ...newRules[index], field };
    setSortRules(newRules);
  };

  const handleDirectionChange = (index: number, checked: boolean) => {
    const newRules = [...sortRules];
    newRules[index] = { ...newRules[index], direction: checked ? 'desc' : 'asc' };
    setSortRules(newRules);
  };

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto">
      {/* 정보 Section */}
      <div className="px-4">
        <Accordion type="multiple" defaultValue={["title", "author"]}>
          {/* 학습지명 */}
          <AccordionItem value="title" className="border-none">
            <AccordionTrigger className="hover:no-underline" tabIndex={-1}>
              <span>학습지명 <span className="text-red-500">*</span></span>
            </AccordionTrigger>
            <AccordionContent>
              <Input
                placeholder="학습지 제목을 입력하세요"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`focus-visible:ring-0 ${errors?.title ? 'border-red-500' : 'border-black'} ${readOnly ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                disabled={readOnly}
              />
              {errors?.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title}</p>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* 출제자 */}
          <AccordionItem value="author" className="border-none">
            <AccordionTrigger className="hover:no-underline" tabIndex={-1}>
              <span>출제자 <span className="text-red-500">*</span></span>
            </AccordionTrigger>
            <AccordionContent>
              <Input
                placeholder="출제자 이름을 입력하세요"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className={`focus-visible:ring-0 ${errors?.author ? 'border-red-500' : 'border-black'} ${readOnly ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                disabled={readOnly}
              />
              {errors?.author && (
                <p className="text-red-500 text-sm mt-1">{errors.author}</p>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* 표지 */}
          <AccordionItem value="thumbnail" className="border-none">
            <AccordionTrigger className="hover:no-underline" tabIndex={-1}>
              <span>표지</span>
            </AccordionTrigger>
            <AccordionContent>
              {readOnly ? (
                displayUrl ? (
                  <div className="relative w-full aspect-[1/1.414] bg-gray-50 rounded-md overflow-hidden">
                    <Image
                      src={displayUrl}
                      alt="표지 이미지"
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">표지 이미지 없음</div>
                )
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {displayUrl ? (
                    /* Preview with remove button */
                    <div className="relative">
                      <div className="relative w-full aspect-[1/1.414] bg-gray-50 rounded-md overflow-hidden border border-gray-200">
                        <Image
                          src={displayUrl}
                          alt="표지 미리보기"
                          fill
                          className="object-contain"
                        />
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1"
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          변경
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveThumbnail}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      {thumbnailFile && (
                        <p className="text-xs text-amber-600 mt-1">저장 시 업로드됩니다</p>
                      )}
                    </div>
                  ) : (
                    /* Upload button */
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-md text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors cursor-pointer"
                    >
                      <Upload className="w-8 h-8" />
                      <span className="text-sm">이미지 업로드</span>
                      <span className="text-xs text-gray-400">PNG, JPG (최대 10MB)</span>
                    </button>
                  )}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--border)]" />

      {/* 정렬 Section */}
      <div className="px-4">
        <Accordion type="multiple" defaultValue={["sort"]}>
          <AccordionItem value="sort" className="border-none">
            <AccordionTrigger className="hover:no-underline" tabIndex={-1}>
              <span>정렬</span>
            </AccordionTrigger>
            <AccordionContent>
              {readOnly ? (
                /* Read-only view for non-owners */
                <div className="flex flex-col gap-2">
                  <div className="text-sm text-gray-500">
                    {activePreset === '수동' ? '수동' :
                     activePreset === '무작위' ? '무작위' :
                     activePreset === '연습' ? '연습' :
                     sortRulesWithIds.map(rule =>
                       `${SORT_FIELD_LABELS[rule.field as Exclude<SortField, 'random' | 'manual'>]} (${rule.direction === 'asc' ? '오름차순' : '내림차순'})`
                     ).join(' → ')}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Preset buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {(['수동', '무작위', '연습', '커스텀'] as SortPreset[]).map((preset) => (
                      <Button
                        key={preset}
                        onClick={() => handlePresetClick(preset)}
                        variant="outline"
                        className={activePreset === preset ? 'border-black text-black bg-gray-100' : ''}
                      >
                        {preset}
                      </Button>
                    ))}
                  </div>

                  {/* Sort rules list */}
                  <div className="flex flex-col gap-2">
                    {sortRulesWithIds.length === 1 && sortRulesWithIds[0].field === 'manual' ? (
                      /* Manual element for 수동 mode - matches 무작위 style */
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2 p-2 border border-gray-200 rounded-md bg-white">
                          <div className="flex items-center gap-2">
                            <div className="p-0.5 text-gray-300 flex-shrink-0">
                              <GripVertical className="w-4 h-4" />
                            </div>
                            <div className="w-[140px] h-8 px-3 flex items-center border border-gray-200 rounded-md bg-gray-50 text-gray-500 text-sm">
                              수동
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              // Remove manual and add first available field
                              const newRule: SortRule = { field: modeFields[0], direction: 'asc' };
                              setSortRules([newRule]);
                              const newIds = new Map<number, string>();
                              newIds.set(0, `rule-${Date.now()}`);
                              setInternalIds(newIds);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-xs text-gray-400 pl-1">
                          문제를 드래그하여 순서를 변경할 수 있습니다
                        </div>
                      </div>
                    ) : sortRulesWithIds.length === 1 && sortRulesWithIds[0].field === 'random' ? (
                      /* Random element for 무작위 mode - matches 수동 style */
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2 p-2 border border-gray-200 rounded-md bg-white">
                          <div className="flex items-center gap-2">
                            <div className="p-0.5 text-gray-300 flex-shrink-0">
                              <GripVertical className="w-4 h-4" />
                            </div>
                            <div className="w-[140px] h-8 px-3 flex items-center border border-gray-200 rounded-md bg-gray-50 text-gray-500 text-sm">
                              무작위
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              // Remove random and add first available field
                              const newRule: SortRule = { field: modeFields[0], direction: 'asc' };
                              setSortRules([newRule]);
                              const newIds = new Map<number, string>();
                              newIds.set(0, `rule-${Date.now()}`);
                              setInternalIds(newIds);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-xs text-gray-400 pl-1">
                          문제가 무작위로 섞입니다
                        </div>
                      </div>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext items={sortRulesWithIds.map(r => r.id)} strategy={verticalListSortingStrategy}>
                          {sortRulesWithIds.map((rule, index) => {
                            // Available fields for this dropdown: current field + unused fields from mode
                            const otherUsedFields = usedFields.filter(f => f !== rule.field);
                            const availableForThisRow = modeFields.filter(f => !otherUsedFields.includes(f));
                            return (
                              <SortableItem
                                key={rule.id}
                                id={rule.id}
                                rule={rule}
                                index={index}
                                availableFieldsForDropdown={availableForThisRow}
                                onFieldChange={handleFieldChange}
                                onDirectionChange={handleDirectionChange}
                                onRemove={handleRemoveRule}
                              />
                            );
                          })}
                        </SortableContext>
                      </DndContext>
                    )}

                    {/* Add rule button - hidden when all fields are used or in 수동/무작위 mode */}
                    {activePreset !== '수동' && activePreset !== '무작위' && availableFields.length > 0 && (
                      <button
                        onClick={handleAddRule}
                        className="flex items-center gap-2 p-2 border border-dashed border-gray-300 rounded-md text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-sm">정렬 추가</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
