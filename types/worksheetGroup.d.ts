interface FilterQuery {
  isBest?: boolean
  tags?: string[]
  excludeTags?: string[]
  userId?: string
  subjects?: string[]
}

interface WorksheetGroup {
  id: number
  image_url: string | null
  title: string
  view_count: number
  created_at: string
  tags: string[] | null
  worksheet_ids: string[]
  worksheets: { id: string; subject_id: string | null; target_grades: string[] }[]
}
