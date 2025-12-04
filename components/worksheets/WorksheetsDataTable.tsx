"use client"

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  Table as TableType,
} from "@tanstack/react-table"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface WorksheetsDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onTableReady?: (table: TableType<TData>) => void
  emptyMessage?: string
}

export function WorksheetsDataTable<TData, TValue>({
  columns,
  data,
  onTableReady,
  emptyMessage = "데이터가 없습니다.",
}: WorksheetsDataTableProps<TData, TValue>) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  })

  useEffect(() => {
    if (onTableReady) {
      onTableReady(table)
    }
  }, [table, onTableReady])

  return (
    <div className="relative w-full animate-fade-in">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-[var(--gray-50)] shadow-[0_1px_0_var(--border)]">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const width = header.column.columnDef.meta?.width
                return (
                  <th
                    key={header.id}
                    className="h-10 px-4 text-left align-middle font-medium text-[var(--foreground)] whitespace-nowrap bg-[var(--gray-50)]"
                    style={{
                      width: width || 'auto',
                      minWidth: header.column.columnDef.meta?.minWidth || 'auto'
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className="hover:bg-gray-50 cursor-pointer transition-colors border-b border-[var(--border)]"
                onClick={() => {
                  const worksheet = row.original as { id: string }
                  router.push(`/w/${worksheet.id}`)
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="p-4 align-middle"
                  >
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr className="border-b border-[var(--border)]">
              <td
                colSpan={columns.length}
                className="h-24 text-center text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// Extend tanstack table column meta type
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    width?: string
    minWidth?: string
  }
}
