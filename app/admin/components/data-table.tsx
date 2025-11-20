'use client';

import { ReactNode } from 'react';
import { Loader } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string | ReactNode;
  width?: number;
  resizable?: boolean;
  render: (item: T, index: number) => ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  rowClassName?: string | ((item: T, index: number) => string);
}

export function DataTable<T extends { id?: string | number }>({
  data,
  columns,
  loading = false,
  emptyMessage = '데이터가 없습니다.',
  onRowClick,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  rowClassName = '',
}: DataTableProps<T>) {
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
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-3 py-2 text-left text-xs border-r"
                  style={{ width: column.width ? `${column.width}px` : 'auto' }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={bodyClassName}>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-4 text-center">
                  <Loader className="animate-spin w-4 h-4 inline-block" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-xs text-gray-500">
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
                  {columns.map((column) => (
                    <td key={column.key} className="px-3 py-2 border-r">
                      {column.render(item, index)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
