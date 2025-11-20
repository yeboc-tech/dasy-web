'use client';

import { useState, useEffect } from 'react';
import { Loader, Search, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface LabelType {
  id: string;
  name: string;
  description: string | null;
  value_type: string;
  value_constraints: Record<string, unknown>;
  created_at: string;
  label_count?: number;
}

export default function LabelTypesPage() {
  const [labelTypes, setLabelTypes] = useState<LabelType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [editingType, setEditingType] = useState<LabelType | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    value_type: 'categorical',
    value_constraints: {} as Record<string, unknown>
  });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchLabelTypes();
  }, [searchFilter]);

  const fetchLabelTypes = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('label_types')
        .select('*, labels(count)')
        .order('name');

      if (searchFilter) {
        query = query.or(`name.ilike.%${searchFilter}%,description.ilike.%${searchFilter}%`);
      }

      const { data: types, error } = await query;

      if (error) throw error;

      const typesWithCounts = types?.map(type => ({
        ...type,
        label_count: type.labels?.[0]?.count || 0,
        labels: undefined
      })) || [];

      setLabelTypes(typesWithCounts);
    } catch (error) {
      console.error('Error fetching label types:', error);
    } finally {
      setLoading(false);
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

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    try {
      setSaving(true);

      if (editingType) {
        const { error } = await supabase
          .from('label_types')
          .update({
            name: formData.name,
            description: formData.description || null,
            value_type: formData.value_type,
            value_constraints: formData.value_constraints,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingType.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('label_types')
          .insert({
            name: formData.name,
            description: formData.description || null,
            value_type: formData.value_type,
            value_constraints: formData.value_constraints
          });

        if (error) throw error;
      }

      setFormData({ name: '', description: '', value_type: 'categorical', value_constraints: {} });
      setEditingType(null);
      setShowModal(false);
      fetchLabelTypes();
    } catch (error) {
      console.error('Error saving label type:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까? 연결된 모든 라벨도 함께 삭제됩니다.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('label_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchLabelTypes();
    } catch (error) {
      console.error('Error deleting label type:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const openEditModal = (type: LabelType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      description: type.description || '',
      value_type: type.value_type || 'categorical',
      value_constraints: type.value_constraints || {}
    });
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingType(null);
    setFormData({ name: '', description: '', value_type: 'categorical', value_constraints: {} });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingType(null);
    setFormData({ name: '', description: '', value_type: 'categorical', value_constraints: {} });
  };

  if (loading && labelTypes.length === 0) {
    return (
      <div className="h-full flex-1 bg-white">
        <div className="max-w-4xl mx-auto p-4">
          <h1 className="text-base font-normal mb-4">라벨 타입</h1>
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
          <h1 className="text-base font-medium">라벨 타입</h1>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-3 py-1.5 text-xs border hover:bg-gray-50 cursor-pointer"
          >
            새 타입 추가
          </button>
        </div>

        {/* Table */}
        <div className="bg-white border flex-1 flex flex-col overflow-hidden">
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-gray-100 border-b sticky top-0" style={{ zIndex: 50 }}>
                <tr>
                  <th className="px-3 py-2 text-left text-xs border-r" style={{ width: '200px' }}>
                    <div className="flex items-center justify-between">
                      <span>이름</span>
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
                  <th className="px-3 py-2 text-left text-xs border-r" style={{ width: '400px' }}>설명</th>
                  <th className="px-3 py-2 text-center text-xs border-r" style={{ width: '100px' }}>라벨 수</th>
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
                ) : labelTypes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-xs text-gray-500">
                      {searchFilter ? '검색 결과가 없습니다.' : '라벨 타입이 없습니다.'}
                    </td>
                  </tr>
                ) : (
                  labelTypes.map((type) => (
                    <tr key={type.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 border-r">
                        <span className="text-xs font-medium">{type.name}</span>
                      </td>
                      <td className="px-3 py-2 border-r">
                        <span className="text-xs text-gray-600">{type.description || '-'}</span>
                      </td>
                      <td className="px-3 py-2 text-center border-r">
                        <span className="text-xs text-gray-600">{type.label_count}</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(type)}
                            className="px-2 py-1 text-xs border hover:bg-gray-50 cursor-pointer"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDelete(type.id)}
                            className="px-2 py-1 text-xs border hover:bg-red-50 cursor-pointer text-red-600"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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
                {editingType ? '라벨 타입 수정' : '새 라벨 타입 추가'}
              </h2>
            </div>

            <div className="px-4 py-4 space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!!editingType}
                  className="w-full px-2 py-1.5 text-xs border outline-none focus:border-gray-400"
                  placeholder="예: curriculum, subject, tag"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">설명</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border outline-none focus:border-gray-400"
                  placeholder="예: 교육과정 (2015 개정, 2022 개정)"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  값 타입 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.value_type}
                  onChange={(e) => setFormData({ ...formData, value_type: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border outline-none focus:border-gray-400"
                >
                  <option value="categorical">Categorical (카테고리)</option>
                  <option value="numeric">Numeric (숫자)</option>
                </select>
              </div>

              {formData.value_type === 'numeric' && (
                <div className="space-y-2 border-l-2 border-gray-200 pl-3">
                  <div className="text-xs text-gray-600 font-medium">숫자 제약 조건</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">최소값</label>
                      <input
                        type="number"
                        value={(formData.value_constraints?.min as number) || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          value_constraints: { ...formData.value_constraints, min: Number(e.target.value) }
                        })}
                        className="w-full px-2 py-1 text-xs border outline-none focus:border-gray-400"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">최대값</label>
                      <input
                        type="number"
                        value={(formData.value_constraints?.max as number) || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          value_constraints: { ...formData.value_constraints, max: Number(e.target.value) }
                        })}
                        className="w-full px-2 py-1 text-xs border outline-none focus:border-gray-400"
                        placeholder="100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">단위</label>
                      <input
                        type="text"
                        value={(formData.value_constraints?.unit as string) || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          value_constraints: { ...formData.value_constraints, unit: e.target.value }
                        })}
                        className="w-full px-2 py-1 text-xs border outline-none focus:border-gray-400"
                        placeholder="%"
                      />
                    </div>
                  </div>
                </div>
              )}
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
                disabled={saving || !formData.name.trim()}
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
