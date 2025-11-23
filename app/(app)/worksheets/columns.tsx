"use client"

import { ColumnDef } from "@tanstack/react-table"

export interface WorksheetItem {
  id: string
  title: string
  author: string
  created_at: string
  selected_problem_ids: string[]
}

export const columns: ColumnDef<WorksheetItem>[] = [
  {
    id: "index",
    header: "번호",
    cell: ({ row }) => {
      return <div className="w-8">{row.index + 1}</div>
    },
  },
  {
    accessorKey: "title",
    header: "제목",
    cell: ({ row }) => {
      return (
        <div className="font-medium">
          {row.getValue("title")}
        </div>
      )
    },
  },
  {
    accessorKey: "author",
    header: "출제자",
  },
  {
    accessorKey: "selected_problem_ids",
    header: "문제 수",
    cell: ({ row }) => {
      const problemIds = row.getValue("selected_problem_ids") as string[]
      return <div>{problemIds?.length || 0}문제</div>
    },
  },
  {
    accessorKey: "created_at",
    header: "생성일",
    cell: ({ row }) => {
      return new Date(row.getValue("created_at")).toLocaleDateString("ko-KR")
    },
  },
]