import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MypageClient from './MypageClient'

export default async function MypagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profiles }, { data: bookmarks }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, profile_name, education_level, major_category, major_detail, school_name, school_region, gpa, double_major, is_veterans, is_disabled, is_local_talent, is_non_capital, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('bookmarks')
      .select('id, enterprise_id, created_at, public_enterprises(id, name, type, ministry, location, website_url, last_updated)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <MypageClient
      userEmail={user.email ?? ''}
      initialProfiles={profiles ?? []}
      initialBookmarks={bookmarks ?? []}
    />
  )
}
