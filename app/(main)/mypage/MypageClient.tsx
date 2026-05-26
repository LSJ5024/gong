'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { EducationLevel, MajorCategory } from '@/types'

// 알림 설정 타입
type NotificationSettings = {
  new_job_posting: boolean       // 관심 기업 신규 채용 공고
  language_expiry_d30: boolean   // 어학성적 만료 D-30
  language_expiry_d7: boolean    // 어학성적 만료 D-7
  bonus_update: boolean          // 가산점 기준 DB 업데이트
}

const NOTIFICATION_ITEMS: { key: keyof NotificationSettings; label: string; desc: string; icon: string }[] = [
  { key: 'new_job_posting',     label: '신규 채용 공고',      desc: '관심 기업에 새 채용공고가 등록되면 알려드립니다.',        icon: '📢' },
  { key: 'language_expiry_d30', label: '어학성적 만료 D-30',  desc: '어학성적 유효기간 만료 30일 전 미리 알려드립니다.',        icon: '📅' },
  { key: 'language_expiry_d7',  label: '어학성적 만료 D-7',   desc: '어학성적 유효기간 만료 7일 전 다시 한번 알려드립니다.',    icon: '⚠️' },
  { key: 'bonus_update',        label: '가산점 기준 업데이트', desc: '관심 기업의 가산점 기준이 변경되면 알려드립니다.',          icon: '🔄' },
]

const STORAGE_KEY = 'gong_notification_settings'

function loadNotificationSettings(): NotificationSettings {
  if (typeof window === 'undefined') {
    return { new_job_posting: true, language_expiry_d30: true, language_expiry_d7: true, bonus_update: true }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as NotificationSettings
  } catch { /* ignore */ }
  return { new_job_posting: true, language_expiry_d30: true, language_expiry_d7: true, bonus_update: true }
}

type ProfileRow = {
  id: string
  profile_name: string
  education_level: string | null
  major_category: string | null
  major_detail: string | null
  school_name: string | null
  school_region: string | null
  gpa: number | null
  double_major: string | null
  is_veterans: boolean
  is_disabled: boolean
  is_local_talent: boolean
  is_non_capital: boolean
  updated_at: string
}

type BookmarkRow = {
  id: string
  enterprise_id: string
  created_at: string
  public_enterprises: {
    id: string
    name: string
    type: string
    ministry: string | null
    location: string | null
    website_url: string | null
    last_updated: string
  } | null
}

const EDUCATION_LEVELS: EducationLevel[] = ['고졸', '전문학사', '학사', '석사', '박사']
const MAJOR_CATEGORIES: MajorCategory[] = ['이공계', '상경계', '인문사회계', '사범계', '예체능', '기타']
const ENTERPRISE_TYPE_COLOR: Record<string, string> = {
  '공기업': 'bg-blue-100 text-blue-700',
  '준정부기관': 'bg-green-100 text-green-700',
  '기타공공기관': 'bg-gray-100 text-gray-600',
}

export default function MypageClient({
  userEmail,
  initialProfiles,
  initialBookmarks,
}: {
  userEmail: string
  initialProfiles: ProfileRow[]
  initialBookmarks: BookmarkRow[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'profile' | 'bookmarks' | 'notifications'>('profile')
  const [profiles, setProfiles] = useState(initialProfiles)
  const [bookmarks, setBookmarks] = useState(initialBookmarks)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<ProfileRow>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(loadNotificationSettings)
  const [notifSaved, setNotifSaved] = useState(false)

  // 알림 설정 변경 시 localStorage 저장
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifSettings))
  }, [notifSettings])

  function toggleNotif(key: keyof NotificationSettings) {
    setNotifSettings((prev) => ({ ...prev, [key]: !prev[key] }))
    setNotifSaved(false)
  }

  function saveNotifSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifSettings))
    setNotifSaved(true)
    setTimeout(() => setNotifSaved(false), 2500)
  }

  function startEdit(profile: ProfileRow) {
    setEditingId(profile.id)
    setEditForm({ ...profile })
    setSaveError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm({})
  }

  async function saveProfile() {
    if (!editingId) return
    setSaving(true)
    setSaveError('')

    const res = await fetch(`/api/profiles?profileId=${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile_name: editForm.profile_name,
        education_level: editForm.education_level || null,
        major_category: editForm.major_category || null,
        major_detail: editForm.major_detail || null,
        school_name: editForm.school_name || null,
        school_region: editForm.school_region || null,
        gpa: editForm.gpa ?? null,
        double_major: editForm.double_major || null,
        is_veterans: editForm.is_veterans ?? false,
        is_disabled: editForm.is_disabled ?? false,
        is_local_talent: editForm.is_local_talent ?? false,
        is_non_capital: editForm.is_non_capital ?? false,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setSaveError('저장 중 오류가 발생했습니다.')
    } else {
      setProfiles((prev) =>
        prev.map((p) => (p.id === editingId ? { ...p, ...data.profile } : p))
      )
      setEditingId(null)
      router.refresh()
    }
    setSaving(false)
  }

  async function removeBookmark(enterpriseId: string) {
    const res = await fetch(`/api/bookmarks?enterpriseId=${enterpriseId}`, { method: 'DELETE' })
    if (res.ok) {
      setBookmarks((prev) => prev.filter((b) => b.enterprise_id !== enterpriseId))
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* 프로필 헤더 */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
          {userEmail[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-gray-900">{userEmail}</p>
          <p className="text-sm text-gray-400">공기업 가산점 추천 서비스</p>
        </div>
        <Link
          href="/profile/setup"
          className="ml-auto text-sm border border-gray-300 text-gray-600 px-4 py-1.5 rounded-lg hover:bg-gray-50"
        >
          + 새 프로필
        </Link>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-gray-200 mb-6">
        {([
          { id: 'profile',       label: `내 프로필 (${profiles.length})` },
          { id: 'bookmarks',     label: `관심 기업 (${bookmarks.length})` },
          { id: 'notifications', label: '알림 설정' },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 프로필 탭 */}
      {tab === 'profile' && (
        <div className="space-y-4">
          {profiles.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <p className="text-gray-500 text-sm mb-4">등록된 프로필이 없습니다.</p>
              <Link
                href="/profile/setup"
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                프로필 등록하기
              </Link>
            </div>
          )}
          {profiles.map((profile) => (
            <div key={profile.id} className="bg-white rounded-2xl shadow-sm p-5">
              {editingId === profile.id ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">프로필 이름</label>
                    <input
                      type="text"
                      value={editForm.profile_name ?? ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, profile_name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">최종 학력</label>
                      <select
                        value={editForm.education_level ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, education_level: e.target.value || null }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">선택</option>
                        {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">전공 계열</label>
                      <select
                        value={editForm.major_category ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, major_category: e.target.value || null }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">선택</option>
                        {MAJOR_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">전공 세부</label>
                      <input
                        type="text"
                        value={editForm.major_detail ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, major_detail: e.target.value || null }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="예: 전기전자"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">학교 소재지</label>
                      <input
                        type="text"
                        value={editForm.school_region ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, school_region: e.target.value || null }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="예: 서울, 부산"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { key: 'is_veterans', label: '보훈' },
                      { key: 'is_disabled', label: '장애인' },
                      { key: 'is_local_talent', label: '지역인재' },
                      { key: 'is_non_capital', label: '비수도권' },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-1.5 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={editForm[key as keyof ProfileRow] as boolean ?? false}
                          onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  {saveError && <p className="text-red-500 text-sm">{saveError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={saveProfile}
                      disabled={saving}
                      className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? '저장 중...' : '저장'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">{profile.profile_name}</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {profile.education_level && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {profile.education_level}
                          </span>
                        )}
                        {profile.major_category && (
                          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                            {profile.major_category}
                            {profile.major_detail ? ` · ${profile.major_detail}` : ''}
                          </span>
                        )}
                        {profile.school_region && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            📍 {profile.school_region}
                          </span>
                        )}
                        {profile.is_veterans && <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">보훈</span>}
                        {profile.is_disabled && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">장애인</span>}
                        {profile.is_local_talent && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">지역인재</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        수정일: {new Date(profile.updated_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <button
                      onClick={() => startEdit(profile)}
                      className="text-sm text-blue-600 hover:underline shrink-0 ml-4"
                    >
                      수정
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 알림 설정 탭 */}
      {tab === 'notifications' && (
        <div className="space-y-4">
          {/* 이메일 알림 준비 중 배너 */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-amber-500 text-lg shrink-0">🔔</span>
            <div>
              <p className="text-sm font-medium text-amber-800">이메일 알림 준비 중</p>
              <p className="text-xs text-amber-600 mt-0.5">
                아래 설정은 저장되며, 이메일 알림 기능 활성화 시 즉시 적용됩니다.
              </p>
            </div>
          </div>

          {/* 알림 항목 토글 */}
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
            {NOTIFICATION_ITEMS.map(({ key, label, desc, icon }) => (
              <div key={key} className="flex items-center justify-between p-5">
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0 mt-0.5">{icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
                {/* 토글 스위치 */}
                <button
                  role="switch"
                  aria-checked={notifSettings[key]}
                  onClick={() => toggleNotif(key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    notifSettings[key] ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      notifSettings[key] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          {/* 저장 버튼 */}
          <button
            onClick={saveNotifSettings}
            className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
              notifSaved
                ? 'bg-green-500 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {notifSaved ? '✓ 저장되었습니다' : '설정 저장'}
          </button>

          <p className="text-xs text-gray-400 text-center">
            알림 수신 이메일: <span className="font-medium text-gray-600">{userEmail}</span>
          </p>
        </div>
      )}

      {/* 관심 기업 탭 */}
      {tab === 'bookmarks' && (
        <div className="space-y-3">
          {bookmarks.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <p className="text-gray-500 text-sm mb-4">북마크한 기업이 없습니다.</p>
              <Link
                href="/recommendations"
                className="inline-block text-blue-600 text-sm hover:underline"
              >
                추천 결과에서 기업 북마크하기
              </Link>
            </div>
          )}
          {bookmarks.map((b) => {
            const ent = b.public_enterprises
            if (!ent) return null
            return (
              <div key={b.id} className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/recommendations/${ent.id}`}
                      className="font-bold text-gray-900 hover:text-blue-600"
                    >
                      {ent.name}
                    </Link>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ENTERPRISE_TYPE_COLOR[ent.type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {ent.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{ent.location}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {ent.website_url && (
                    <a
                      href={ent.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline"
                    >
                      홈페이지
                    </a>
                  )}
                  <button
                    onClick={() => removeBookmark(b.enterprise_id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    삭제
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
