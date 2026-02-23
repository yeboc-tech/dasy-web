import { createClient } from '@/lib/supabase/client'

export async function fetchWorksheetGroups(
  filter: FilterQuery = {}
): Promise<WorksheetGroup[]> {
  const supabase = createClient()

  let groups: {
    id: number
    image_url: string | null
    title: string
    view_count: number
    created_at: string
    tags: string[] | null
    worksheet_ids: string[]
  }[] = []

  if (filter.userId) {
    const { data, error } = await supabase
      .from('worksheet_group_favorites')
      .select('worksheet_group:worksheet_group_id(id, image_url, title, view_count, created_at, tags, worksheet_ids)')
      .eq('user_id', filter.userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching worksheet group favorites:', error)
      return []
    }

    groups = data?.map((item) => item.worksheet_group as unknown as typeof groups[number]).filter(Boolean) || []
  } else {
    let query = supabase
      .from('worksheet_group')
      .select('id, image_url, title, view_count, created_at, tags, worksheet_ids')

    if (filter.isBest) {
      query = query.eq('is_best', true)
    }

    if (filter.tags) {
      query = query.contains('tags', filter.tags)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching worksheet groups:', error)
      return []
    }

    groups = data || []
  }

  if (filter.excludeTags) {
    const hiddenTags = filter.excludeTags
    groups = groups.filter(g => {
      const tags = g.tags || []
      return !(tags.length === 1 && hiddenTags.includes(tags[0]))
    })
  }

  const allWsIds = groups.flatMap(g => g.worksheet_ids || [])

  let worksheetMap = new Map<string, { id: string; subject_id: string | null }>()
  if (allWsIds.length > 0) {
    const { data: worksheets } = await supabase
      .from('worksheets')
      .select('id, subject_id')
      .in('id', allWsIds)
    for (const w of worksheets || []) {
      worksheetMap.set(w.id, w)
    }
  }

  return groups.map(g => ({
    ...g,
    worksheets: (g.worksheet_ids || [])
      .map(id => worksheetMap.get(id))
      .filter((w): w is { id: string; subject_id: string | null } => !!w),
  }))
}
