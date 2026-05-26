import Link from 'next/link'

const STEPS = [
  { num: '1', title: '프로필 등록', desc: '자격증·어학성적·전공을 5분 안에 입력' },
  { num: '2', title: 'DB 자동 분석', desc: '전국 공기업 가산점 기준과 자동 매칭' },
  { num: '3', title: '순위 추천', desc: '내 스펙에 가장 유리한 공기업 TOP 20 제공' },
]

const FEATURES = [
  { icon: '🎯', title: '맞춤 순위 추천', desc: '내 자격증·어학·전공을 기준으로 가산점이 높은 공기업을 순위별로 안내' },
  { icon: '📊', title: '항목별 상세 내역', desc: '어떤 항목에서 몇 %를 받는지 출처와 함께 투명하게 공개' },
  { icon: '🔔', title: '채용 공고 알림', desc: '관심 기업에 채용이 열리면 즉시 알림 (Phase 2)' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <header className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-blue-600 text-lg">공기업 가산점 추천</span>
          <div className="flex gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5">
              로그인
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700"
            >
              무료 시작
            </Link>
          </div>
        </div>
      </header>

      {/* 히어로 */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-20 px-4 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
          내 스펙으로 가장 유리한
          <br />
          <span className="text-blue-600">공기업</span>을 찾아드립니다
        </h1>
        <p className="text-gray-500 mt-4 text-base sm:text-lg max-w-xl mx-auto">
          자격증·어학성적·전공을 입력하면 전국 공기업 가산점 DB를 분석해
          합격 가능성이 높은 공기업을 순위별로 추천해줍니다.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link
            href="/signup"
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-medium text-base hover:bg-blue-700 transition-colors"
          >
            무료로 시작하기
          </Link>
          <Link
            href="/login"
            className="border border-gray-300 text-gray-700 px-8 py-3 rounded-xl font-medium text-base hover:bg-gray-50 transition-colors"
          >
            로그인
          </Link>
        </div>
      </section>

      {/* 이용 방법 */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">이용 방법</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {STEPS.map((s) => (
            <div key={s.num} className="text-center">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white text-lg font-bold flex items-center justify-center mx-auto mb-3">
                {s.num}
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{s.title}</h3>
              <p className="text-sm text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 주요 기능 */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">주요 기능</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">지금 바로 확인해보세요</h2>
        <p className="text-gray-500 text-sm mb-6">가입 후 5분이면 내 스펙에 맞는 공기업 순위를 볼 수 있습니다.</p>
        <Link
          href="/signup"
          className="inline-block bg-blue-600 text-white px-10 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          무료로 시작하기
        </Link>
      </section>

      {/* 푸터 */}
      <footer className="border-t border-gray-100 py-6 px-4 text-center text-xs text-gray-400">
        본 서비스의 가산점 정보는 참고용이며 실제 채용공고를 반드시 확인하세요.
      </footer>
    </div>
  )
}
