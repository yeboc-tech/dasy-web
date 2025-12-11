import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://tong.kidari.ai'
  const supabase = await createClient()

  // Fetch all public worksheets
  const { data: worksheets } = await supabase
    .from('worksheets')
    .select('id, created_at')
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/worksheets`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/auth/signin`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/auth/signup`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  // Dynamic worksheet pages
  const worksheetPages: MetadataRoute.Sitemap = (worksheets || []).map((worksheet) => ({
    url: `${baseUrl}/w/${worksheet.id}`,
    lastModified: new Date(worksheet.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...worksheetPages]
}