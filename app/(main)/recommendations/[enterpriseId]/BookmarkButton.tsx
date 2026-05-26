'use client'

import { useState } from 'react'

export default function BookmarkButton({
  enterpriseId,
  initialBookmarked,
}: {
  enterpriseId: string
  initialBookmarked: boolean
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    if (loading) return
    setLoading(true)
    if (bookmarked) {
      await fetch(`/api/bookmarks?enterpriseId=${enterpriseId}`, { method: 'DELETE' })
      setBookmarked(false)
    } else {
      await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enterprise_id: enterpriseId }),
      })
      setBookmarked(true)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
        bookmarked
          ? 'border-yellow-400 bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
          : 'border-gray-300 text-gray-500 hover:bg-gray-50'
      }`}
    >
      <span>{bookmarked ? '★' : '☆'}</span>
      <span>{bookmarked ? '북마크됨' : '북마크'}</span>
    </button>
  )
}
