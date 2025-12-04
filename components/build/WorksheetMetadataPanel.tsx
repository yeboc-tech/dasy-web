'use client';

import { useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GripVertical, Plus, X, Shuffle } from 'lucide-react';
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
  PRESET_RULES,
  getMatchingPreset,
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
  onFieldChange: (index: number, field: SortField) => void;
  onDirectionChange: (index: number, checked: boolean) => void;
  onRemove: (index: number) => void;
}

function SortableItem({ id, rule, index, onFieldChange, onDirectionChange, onRemove }: SortableItemProps) {
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
            {Object.entries(SORT_FIELD_LABELS).map(([field, label]) => (
              <SelectItem key={field} value={field} className="cursor-pointer hover:bg-gray-100">
                {label}
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
  worksheetMode: '연습' | '실전';
  setWorksheetMode: (value: '연습' | '실전') => void;
  errors?: {
    title?: string;
    author?: string;
  };
}

export default function WorksheetMetadataPanel({
  title,
  setTitle,
  author,
  setAuthor,
  worksheetMode,
  setWorksheetMode,
  errors,
}: WorksheetMetadataPanelProps) {
  // Local state for sorting UI (will be lifted to parent later)
  // Each rule has a stable unique id for drag-and-drop
  const [sortRulesWithIds, setSortRulesWithIds] = useState<(SortRule & { id: string })[]>([]);
  const [activePreset, setActivePreset] = useState<SortPreset>('실전');

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
      setSortRulesWithIds((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        const newRules = arrayMove(items, oldIndex, newIndex);
        setActivePreset(getMatchingPreset(newRules));
        return newRules;
      });
    }
  };

  const handlePresetClick = (preset: SortPreset) => {
    setActivePreset(preset);
    if (preset === '실전') {
      setSortRulesWithIds([]);
    } else if (preset === '연습') {
      const rulesWithIds = PRESET_RULES['연습'].map((rule, i) => ({
        ...rule,
        id: `preset-rule-${i}-${Date.now()}`
      }));
      setSortRulesWithIds(rulesWithIds);
    }
    // 커스텀: keep current rules
  };

  const handleAddRule = () => {
    const newRule = { field: 'chapter' as SortField, direction: 'asc' as const, id: `rule-${Date.now()}` };
    setSortRulesWithIds(prev => [...prev, newRule]);
    setActivePreset('커스텀');
  };

  const handleRemoveRule = (index: number) => {
    setSortRulesWithIds(prev => {
      const newRules = prev.filter((_, i) => i !== index);
      setActivePreset(getMatchingPreset(newRules));
      return newRules;
    });
  };

  const handleFieldChange = (index: number, field: SortField) => {
    setSortRulesWithIds(prev => {
      const newRules = [...prev];
      newRules[index] = { ...newRules[index], field };
      setActivePreset(getMatchingPreset(newRules));
      return newRules;
    });
  };

  const handleDirectionChange = (index: number, checked: boolean) => {
    setSortRulesWithIds(prev => {
      const newRules = [...prev];
      newRules[index] = { ...newRules[index], direction: checked ? 'desc' : 'asc' };
      setActivePreset(getMatchingPreset(newRules));
      return newRules;
    });
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
                className={`focus-visible:ring-0 ${errors?.title ? 'border-red-500' : 'border-black'}`}
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
                className={`focus-visible:ring-0 ${errors?.author ? 'border-red-500' : 'border-black'}`}
              />
              {errors?.author && (
                <p className="text-red-500 text-sm mt-1">{errors.author}</p>
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
              <div className="flex flex-col gap-3">
                {/* Preset buttons */}
                <div className="flex gap-2 flex-wrap">
                  {(['실전', '연습', '커스텀'] as SortPreset[]).map((preset) => (
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
                  {sortRulesWithIds.length === 0 ? (
                    /* Random indicator when no rules */
                    <div className="flex items-center gap-2 px-2 h-[50px] border border-dashed border-gray-300 rounded-md bg-gray-50 text-gray-500">
                      <Shuffle className="w-4 h-4" />
                      <span className="text-sm">랜덤 순서로 출력됩니다</span>
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext items={sortRulesWithIds.map(r => r.id)} strategy={verticalListSortingStrategy}>
                        {sortRulesWithIds.map((rule, index) => (
                          <SortableItem
                            key={rule.id}
                            id={rule.id}
                            rule={rule}
                            index={index}
                            onFieldChange={handleFieldChange}
                            onDirectionChange={handleDirectionChange}
                            onRemove={handleRemoveRule}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}

                  {/* Add rule button */}
                  <button
                    onClick={handleAddRule}
                    className="flex items-center gap-2 p-2 border border-dashed border-gray-300 rounded-md text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">정렬 추가</span>
                  </button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
