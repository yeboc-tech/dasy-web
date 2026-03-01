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
  price: number
  worksheets: { id: string; subject_ids: string[]; target_grades: string[] }[]
}
