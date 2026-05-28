import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

const _rawSitemapUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/^﻿/, '').trim()
const BASE_URL = _rawSitemapUrl || 'https://gong-peach.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 정적 페이지
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/recommendations`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/profile/setup`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ]

  // 기업 상세 페이지 (동적)
  try {
    const supabase = await createClient()
    const { data: enterprises } = await supabase
      .from('public_enterprises')
      .select('id, last_updated')

    const enterprisePages: MetadataRoute.Sitemap = (enterprises ?? []).map((e) => ({
      url: `${BASE_URL}/recommendations/${e.id}`,
      lastModified: e.last_updated ? new Date(e.last_updated) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))

    return [...staticPages, ...enterprisePages]
  } catch {
    return staticPages
  }
}
