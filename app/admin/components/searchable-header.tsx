'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface SearchableHeaderProps {
  title: string;
  value: string;
  onSearch: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
}

export function SearchableHeader({
  title,
  value,
  onSearch,
  onClear,
  placeholder = '검색...',
}: SearchableHeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchInput, setSearchInput] = useState(value);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = () => {
    onSearch(searchInput);
    setShowDropdown(false);
  };

  const handleClear = () => {
    setSearchInput('');
    onClear();
  };

  return (
    <div className="flex items-center justify-between">
      <span>{title}</span>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="p-1 hover:bg-gray-200 cursor-pointer"
        >
          <Search className={`w-3 h-3 ${value ? 'text-blue-600' : 'text-gray-400'}`} />
        </button>
        {showDropdown && (
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
                placeholder={placeholder}
                autoFocus
              />
              {(searchInput || value) && (
                <button
                  onClick={handleClear}
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
  );
}
