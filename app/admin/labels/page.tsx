'use client';

import React, { useState, useEffect } from 'react';
import { Loader, Search, X, ChevronRight, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface LabelType {
  id: string;
  name: string;
  description: string | null;
}

interface Label {
  id: string;
  label_type_id: string;
  value: string;
  parent_label_id: string | null;
  display_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  label_type?: LabelType;
  children?: Label[];
  level?: number;
}

export default function LabelsPage() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [labelTypes, setLabelTypes] = useState<LabelType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    label_type_id: '',
    value: '',
    parent_label_id: null as string | null,
    display_order: 0
  });
  const [saving, setSaving] = useState(false);
  const [parentLabels, setParentLabels] = useState<Label[]>([]);
  const supabase = createClient();

  useEffect(() => {
    fetchLabelTypes();
  }, []);

  useEffect(() => {
    fetchLabels();
  }, [searchFilter, typeFilter]);

  const fetchLabelTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('label_types')
        .select('*')
        .order('name');

      if (error) throw error;
      setLabelTypes(data || []);
    } catch (error) {
      console.error('Error fetching label types:', error);
    }
  };

  const fetchLabels = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('labels')
        .select('*, label_type:label_types(*)')
        .order('display_order')
        .order('value');

      if (searchFilter) {
        query = query.ilike('value', `%${searchFilter}%`);
      }

      if (typeFilter) {
        query = query.eq('label_type_id', typeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Build tree structure
      const labelMap = new Map<string, Label>();
      const rootLabels: Label[] = [];

      // First pass: create map
      data?.forEach(label => {
        labelMap.set(label.id, { ...label, children: [] });
      });

      // Second pass: build tree
      data?.forEach(label => {
        const labelNode = labelMap.get(label.id)!;
        if (label.parent_label_id) {
          const parent = labelMap.get(label.parent_label_id);
          if (parent) {
            parent.children!.push(labelNode);
          } else {
            rootLabels.push(labelNode);
          }
        } else {
          rootLabels.push(labelNode);
        }
      });

      setLabels(rootLabels);
    } catch (error) {
      console.error('Error fetching labels:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPotentialParents = async (labelTypeId: string, excludeId?: string) => {
    try {
      const query = supabase
        .from('labels')
        .select('*')
        .eq('label_type_id', labelTypeId)
        .order('value');

      const { data, error } = await query;
      if (error) throw error;

      // Exclude the current label and its descendants
      const filtered = data?.filter(l => l.id !== excludeId) || [];
      setParentLabels(filtered);
    } catch (error) {
      console.error('Error fetching potential parents:', error);
    }
  };

  const handleSearch = () => {
    setSearchFilter(searchInput);
    setShowSearchDropdown(false);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchFilter('');
  };

  const handleTypeFilter = (typeId: string) => {
    setTypeFilter(typeId);
    setShowTypeDropdown(false);
  };

  const handleClearTypeFilter = () => {
    setTypeFilter('');
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleSave = async () => {
    if (!formData.value.trim() || !formData.label_type_id) return;

    try {
      setSaving(true);

      if (editingLabel) {
        const { error } = await supabase
          .from('labels')
          .update({
            value: formData.value,
            parent_label_id: formData.parent_label_id,
            display_order: formData.display_order,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingLabel.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('labels')
          .insert({
            label_type_id: formData.label_type_id,
            value: formData.value,
            parent_label_id: formData.parent_label_id,
            display_order: formData.display_order
          });

        if (error) throw error;
      }

      setFormData({ label_type_id: '', value: '', parent_label_id: null, display_order: 0 });
      setEditingLabel(null);
      setShowModal(false);
      fetchLabels();
    } catch (error) {
      console.error('Error saving label:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까? 하위 라벨도 함께 삭제됩니다.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('labels')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchLabels();
    } catch (error) {
      console.error('Error deleting label:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const openEditModal = (label: Label) => {
    setEditingLabel(label);
    setFormData({
      label_type_id: label.label_type_id,
      value: label.value,
      parent_label_id: label.parent_label_id,
      display_order: label.display_order
    });
    fetchPotentialParents(label.label_type_id, label.id);
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingLabel(null);
    setFormData({ label_type_id: '', value: '', parent_label_id: null, display_order: 0 });
    setParentLabels([]);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingLabel(null);
    setFormData({ label_type_id: '', value: '', parent_label_id: null, display_order: 0 });
    setParentLabels([]);
  };

  const renderLabelRow = (label: Label, level: number = 0): React.ReactElement[] => {
    const rows: React.ReactElement[] = [];
    const hasChildren = label.children && label.children.length > 0;
    const isExpanded = expandedIds.has(label.id);

    rows.push(
      <tr key={label.id} className="border-b hover:bg-gray-50">
        <td className="px-3 py-2 border-r">
          <div className="flex items-center gap-1" style={{ paddingLeft: `${level * 20}px` }}>
            {hasChildren && (
              <button
                onClick={() => toggleExpand(label.id)}
                className="p-0.5 hover:bg-gray-200 cursor-pointer"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-4" />}
            <span className="text-xs font-medium">{label.value}</span>
          </div>
        </td>
        <td className="px-3 py-2 border-r">
          <span className="text-xs text-gray-600">{label.label_type?.name || '-'}</span>
        </td>
        <td className="px-3 py-2 border-r text-center">
          <span className="text-xs text-gray-600">{label.display_order}</span>
        </td>
        <td className="px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => openEditModal(label)}
              className="px-2 py-1 text-xs border hover:bg-gray-50 cursor-pointer"
            >
              수정
            </button>
            <button
              onClick={() => handleDelete(label.id)}
              className="px-2 py-1 text-xs border hover:bg-red-50 cursor-pointer text-red-600"
            >
              삭제
            </button>
          </div>
        </td>
      </tr>
    );

    if (isExpanded && hasChildren) {
      label.children!.forEach(child => {
        rows.push(...renderLabelRow(child, level + 1));
      });
    }

    return rows;
  };

  if (loading && labels.length === 0) {
    return (
      <div className="h-full flex-1 bg-white">
        <div className="max-w-4xl mx-auto p-4">
          <h1 className="text-base font-normal mb-4">라벨</h1>
          <div className="flex items-center justify-center py-20">
            <Loader className="animate-spin w-4 h-4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white h-full flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 60px)' }}>
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-4 w-full flex-1 flex flex-col overflow-hidden">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-base font-normal">라벨</h1>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-3 py-1.5 text-xs border hover:bg-gray-50 cursor-pointer"
          >
            새 라벨 추가
          </button>
        </div>

        {/* Table */}
        <div className="bg-white shadow flex-1 flex flex-col overflow-hidden mb-4">
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-gray-100 border-b sticky top-0" style={{ zIndex: 50 }}>
                <tr>
                  <th className="px-3 py-2 text-left text-xs border-r" style={{ width: '300px' }}>
                    <div className="flex items-center justify-between">
                      <span>라벨</span>
                      <div className="relative">
                        <button
                          onClick={() => setShowSearchDropdown(!showSearchDropdown)}
                          className="p-1 hover:bg-gray-200 cursor-pointer"
                        >
                          <Search className={`w-3 h-3 ${searchFilter ? 'text-blue-600' : 'text-gray-400'}`} />
                        </button>
                        {showSearchDropdown && (
                          <div className="absolute top-full left-0 mt-1 bg-white border shadow-lg p-1" style={{ minWidth: '200px', zIndex: 9999 }}>
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSearch();
                                  }
                                }}
                                className="flex-1 px-2 py-1 text-xs outline-none"
                                placeholder="검색..."
                                autoFocus
                              />
                              {(searchInput || searchFilter) && (
                                <button
                                  onClick={handleClearSearch}
                                  className="flex-shrink-0 cursor-pointer mr-1"
                                >
                                  <X className="w-3 h-3 text-gray-400" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r" style={{ width: '200px' }}>
                    <div className="flex items-center justify-between">
                      <span>타입</span>
                      <div className="relative">
                        <button
                          onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                          className="p-1 hover:bg-gray-200 cursor-pointer"
                        >
                          <Search className={`w-3 h-3 ${typeFilter ? 'text-blue-600' : 'text-gray-400'}`} />
                        </button>
                        {showTypeDropdown && (
                          <div className="absolute top-full left-0 mt-1 bg-white border shadow-lg p-1" style={{ minWidth: '150px', zIndex: 9999 }}>
                            {typeFilter && (
                              <button
                                onClick={handleClearTypeFilter}
                                className="w-full text-left px-2 py-1 text-xs hover:bg-gray-100 cursor-pointer text-red-600"
                              >
                                필터 지우기
                              </button>
                            )}
                            {labelTypes.map(type => (
                              <button
                                key={type.id}
                                onClick={() => handleTypeFilter(type.id)}
                                className={`w-full text-left px-2 py-1 text-xs hover:bg-gray-100 cursor-pointer ${
                                  typeFilter === type.id ? 'bg-blue-50 text-blue-600' : ''
                                }`}
                              >
                                {type.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-center text-xs border-r" style={{ width: '100px' }}>순서</th>
                  <th className="px-3 py-2 text-center text-xs" style={{ width: '100px' }}>작업</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center">
                      <Loader className="animate-spin w-4 h-4 inline-block" />
                    </td>
                  </tr>
                ) : labels.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-xs text-gray-500">
                      {searchFilter || typeFilter ? '검색 결과가 없습니다.' : '라벨이 없습니다.'}
                    </td>
                  </tr>
                ) : (
                  labels.flatMap(label => renderLabelRow(label))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white shadow max-w-md w-full mx-4">
            <div className="px-4 py-3 border-b">
              <h2 className="text-sm font-medium">
                {editingLabel ? '라벨 수정' : '새 라벨 추가'}
              </h2>
            </div>

            <div className="px-4 py-4 space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  타입 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.label_type_id}
                  onChange={(e) => {
                    setFormData({ ...formData, label_type_id: e.target.value, parent_label_id: null });
                    if (e.target.value) {
                      fetchPotentialParents(e.target.value, editingLabel?.id);
                    } else {
                      setParentLabels([]);
                    }
                  }}
                  disabled={!!editingLabel}
                  className="w-full px-2 py-1.5 text-xs border outline-none focus:border-gray-400"
                >
                  <option value="">선택하세요</option>
                  {labelTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  값 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border outline-none focus:border-gray-400"
                  placeholder="예: 2015 개정, 경제, 고급"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">상위 라벨</label>
                <select
                  value={formData.parent_label_id || ''}
                  onChange={(e) => setFormData({ ...formData, parent_label_id: e.target.value || null })}
                  className="w-full px-2 py-1.5 text-xs border outline-none focus:border-gray-400"
                  disabled={!formData.label_type_id}
                >
                  <option value="">없음 (최상위)</option>
                  {parentLabels.map(label => (
                    <option key={label.id} value={label.id}>{label.value}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">표시 순서</label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-2 py-1.5 text-xs border outline-none focus:border-gray-400"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="px-4 py-3 border-t flex items-center justify-end gap-2">
              <button
                onClick={closeModal}
                disabled={saving}
                className="px-3 py-1.5 text-xs border hover:bg-gray-50 cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.value.trim() || !formData.label_type_id}
                className="px-3 py-1.5 text-xs border hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
