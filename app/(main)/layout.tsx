import Link from 'next/link'
import Header from '@/components/layout/Header'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>
      <footer className="border-t border-gray-100 py-6 px-4 text-center text-xs text-gray-400">
        <p>가산점 정보는 참고용이며 실제 채용공고를 반드시 확인하세요.</p>
        <nav aria-label="법적 페이지" className="flex justify-center gap-4 mt-2">
          <Link href="/terms" className="hover:text-gray-600 hover:underline">이용약관</Link>
          <Link href="/privacy" className="hover:text-gray-600 hover:underline">개인정보 처리방침</Link>
        </nav>
      </footer>
    </div>
  )
}
