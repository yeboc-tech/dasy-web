"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Globe, Lock, MoreHorizontal, Trash2, FileSearch } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Base worksheet item (shared fields)
export interface WorksheetItem {
  id: string
  title: string
  author: string
  created_at: string
  selected_problem_ids: string[]
  is_public?: boolean
}

// Columns for 공유 학습지 (public worksheets)
export const createPublicWorksheetsColumns = (
  onPdfGenerate: (id: string) => void
): ColumnDef<WorksheetItem>[] => [
  {
    accessorKey: "title",
    header: "제목",
    meta: { minWidth: '200px' },
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.getValue("title")}</div>
        <div className="text-sm text-gray-500">{row.original.author}</div>
      </div>
    ),
  },
  {
    id: "pdf",
    header: "PDF",
    meta: { width: '80px', minWidth: '80px' },
    cell: ({ row }) => {
      return (
        <div className="flex items-center justify-start">
          <button
            className="h-8 w-8 flex items-center justify-center rounded-md text-gray-500 bg-[var(--gray-100)] hover:bg-[var(--gray-200)] hover:text-gray-700 transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              onPdfGenerate(row.original.id)
            }}
          >
            <FileSearch className="w-4 h-4" />
          </button>
        </div>
      )
    },
  },
  {
    accessorKey: "selected_problem_ids",
    header: "문제 수",
    meta: { width: '100px', minWidth: '100px' },
    cell: ({ row }) => {
      const problemIds = row.getValue("selected_problem_ids") as string[]
      return <div>{problemIds?.length || 0}문제</div>
    },
  },
  {
    accessorKey: "created_at",
    header: "생성일",
    meta: { width: '120px', minWidth: '120px' },
    cell: ({ row }) => {
      return new Date(row.getValue("created_at")).toLocaleDateString("ko-KR")
    },
  },
]

// Legacy export for backwards compatibility
export const publicWorksheetsColumns: ColumnDef<WorksheetItem>[] = createPublicWorksheetsColumns(() => {})

// Columns for 내 학습지 (my worksheets) - with actions dropdown
export const createMyWorksheetsColumns = (
  onDelete: (id: string, title: string) => void,
  onShare: (id: string, title: string, isPublic: boolean) => void,
  onPdfGenerate: (id: string) => void
): ColumnDef<WorksheetItem>[] => [
  {
    accessorKey: "title",
    header: "제목",
    meta: { minWidth: '200px' },
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.getValue("title")}</div>
        <div className="text-sm text-gray-500">{row.original.author}</div>
      </div>
    ),
  },
  {
    id: "pdf",
    header: "PDF",
    meta: { width: '80px', minWidth: '80px' },
    cell: ({ row }) => {
      return (
        <div className="flex items-center justify-start">
          <button
            className="h-8 w-8 flex items-center justify-center rounded-md text-gray-500 bg-[var(--gray-100)] hover:bg-[var(--gray-200)] hover:text-gray-700 transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              onPdfGenerate(row.original.id)
            }}
          >
            <FileSearch className="w-4 h-4" />
          </button>
        </div>
      )
    },
  },
  {
    accessorKey: "selected_problem_ids",
    header: "문제 수",
    meta: { width: '100px', minWidth: '100px' },
    cell: ({ row }) => {
      const problemIds = row.getValue("selected_problem_ids") as string[]
      return <div>{problemIds?.length || 0}문제</div>
    },
  },
  {
    accessorKey: "created_at",
    header: "생성일",
    meta: { width: '120px', minWidth: '120px' },
    cell: ({ row }) => {
      return new Date(row.getValue("created_at")).toLocaleDateString("ko-KR")
    },
  },
  {
    accessorKey: "is_public",
    header: "공개",
    meta: { width: '56px', minWidth: '56px' },
    cell: ({ row }) => {
      const isPublic = row.getValue("is_public") as boolean
      return (
        <div className="flex items-center justify-center">
          {isPublic ? (
            <Globe className="w-4 h-4 text-green-500" />
          ) : (
            <Lock className="w-4 h-4 text-gray-400" />
          )}
        </div>
      )
    },
  },
  {
    id: "actions",
    header: "",
    meta: { width: '48px', minWidth: '48px' },
    cell: ({ row }) => {
      const worksheet = row.original
      const isPublic = worksheet.is_public || false

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-8 w-8 flex items-center justify-center rounded-md text-gray-400 hover:bg-[var(--gray-200)] hover:text-gray-600 transition-colors cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onShare(worksheet.id, worksheet.title, isPublic)
              }}
              className="cursor-pointer hover:bg-[var(--gray-100)]"
            >
              <Globe className="w-4 h-4 mr-2" />
              {isPublic ? '공개 해제' : '공개하기'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onDelete(worksheet.id, worksheet.title)
              }}
              className="cursor-pointer text-red-600 focus:text-red-600 hover:bg-[var(--gray-100)]"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
