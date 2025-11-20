'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';
import { Loader } from 'lucide-react';

export interface ColumnConfig<T> {
  key: string;
  header: string | ReactNode;
  width: number;
  resizable?: boolean;
  render: (item: T, index: number) => ReactNode;
}

interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

interface DataTableAdvancedProps<T> {
  data: T[];
  columns: ColumnConfig<T>[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  rowClassName?: string | ((item: T, index: number) => string);
  pagination?: PaginationConfig;
  footer?: ReactNode;
}

export function DataTableAdvanced<T extends { id?: string | number }>({
  data,
  columns: initialColumns,
  loading = false,
  emptyMessage = '데이터가 없습니다.',
  onRowClick,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  rowClassName = '',
  pagination,
  footer,
}: DataTableAdvancedProps<T>) {
  // Column width management
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const widths: Record<string, number> = {};
    initialColumns.forEach(col => {
      widths[col.key] = col.width;
    });
    return widths;
  });

  const resizingColumn = useRef<string | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = (e: React.MouseEvent, columnKey: string) => {
    resizingColumn.current = columnKey;
    startX.current = e.clientX;
    startWidth.current = columnWidths[columnKey];

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingColumn.current) return;

    const diff = e.clientX - startX.current;
    const newWidth = Math.max(50, startWidth.current + diff);

    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn.current!]: newWidth,
    }));
  };

  const handleMouseUp = () => {
    resizingColumn.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const getRowClassName = (item: T, index: number) => {
    const base = 'border-b hover:bg-gray-50';
    if (typeof rowClassName === 'function') {
      return `${base} ${rowClassName(item, index)}`;
    }
    return `${base} ${rowClassName}`;
  };

  return (
    <div className={`bg-white border flex-1 flex flex-col overflow-hidden ${className}`}>
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
          <thead className={`bg-gray-100 border-b sticky top-0 ${headerClassName}`} style={{ zIndex: 50 }}>
            <tr>
              {initialColumns.map((column, colIndex) => (
                <th
                  key={column.key}
                  className={`px-3 py-2 text-left text-xs relative ${colIndex < initialColumns.length - 1 ? 'border-r' : ''}`}
                  style={{
                    width: columnWidths[column.key],
                    minWidth: columnWidths[column.key]
                  }}
                >
                  {column.header}
                  {column.resizable !== false && (
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, column.key)}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={bodyClassName}>
            {loading ? (
              <tr>
                <td colSpan={initialColumns.length} className="px-3 py-4 text-center">
                  <Loader className="animate-spin w-4 h-4 inline-block" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={initialColumns.length} className="px-3 py-8 text-center text-xs text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={item.id ?? index}
                  className={getRowClassName(item, index)}
                  onClick={() => onRowClick?.(item)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {initialColumns.map((column, colIndex) => (
                    <td key={column.key} className={`px-3 py-2 ${colIndex < initialColumns.length - 1 ? 'border-r' : ''}`}>
                      {column.render(item, index)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {pagination && (
        <div className="sticky bottom-0 bg-white border-t px-3 flex items-center justify-between text-xs" style={{ height: '33px' }}>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              {pagination.page} / {Math.ceil(pagination.total / pagination.pageSize)} 페이지
            </span>
            <select
              value={pagination.pageSize}
              onChange={(e) => {
                pagination.onPageSizeChange(Number(e.target.value));
                pagination.onPageChange(1);
              }}
              style={{
                paddingLeft: '0.5rem',
                paddingRight: '1.75rem',
                paddingTop: '0.25rem',
                paddingBottom: '0.25rem',
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 0.25rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.5em 1.5em',
              }}
              className="border text-xs appearance-none"
            >
              {(pagination.pageSizeOptions || [100, 500, 1000]).map(size => (
                <option key={size} value={size}>{size}개씩 보기</option>
              ))}
            </select>
            <span className="text-gray-600">
              총 {pagination.total}개
            </span>
            {footer}
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))}
              disabled={pagination.page === 1}
              className="text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              이전
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
              className="text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
