import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '이용약관 — 공기업 가산점 추천',
}

const LAST_UPDATED = '2026년 5월 27일'

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link href="/" className="text-sm text-blue-600 hover:underline mb-6 inline-block">
        ← 홈으로
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">이용약관</h1>
      <p className="text-sm text-gray-400 mb-8">최종 업데이트: {LAST_UPDATED}</p>

      <div className="prose prose-sm max-w-none space-y-8 text-gray-700">

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">제1조 (목적)</h2>
          <p className="leading-relaxed">
            이 약관은 공기업 가산점 추천 서비스(이하 '서비스')가 제공하는 모든 서비스의 이용 조건 및 절차,
            이용자와 서비스 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">제2조 (정의)</h2>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>서비스</strong>: 이용자가 입력한 자격증·어학성적·전공 정보를 기반으로 공기업 가산점을 분석하여 맞춤 추천을 제공하는 웹 서비스</li>
            <li><strong>이용자</strong>: 서비스에 접속하여 본 약관에 따라 서비스를 이용하는 회원 및 비회원</li>
            <li><strong>회원</strong>: 서비스에 개인정보를 제공하여 회원가입을 완료한 자</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">제3조 (서비스 이용)</h2>
          <p className="leading-relaxed">
            서비스는 무료로 제공됩니다. 단, 일부 프리미엄 기능은 유료로 제공될 수 있으며,
            유료 서비스 이용 시 별도의 안내에 따릅니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">제4조 (정보의 정확성 및 면책)</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm leading-relaxed text-amber-900">
            <p className="font-bold mb-2">⚠️ 중요 면책 고지</p>
            <ul className="list-disc list-inside space-y-1.5">
              <li>서비스에서 제공하는 공기업 가산점 정보는 <strong>참고용</strong>이며, 실제 채용 기준과 다를 수 있습니다.</li>
              <li>채용 공고별 가산점 기준은 수시로 변경될 수 있으므로, 반드시 <strong>해당 기업의 공식 채용 공고</strong>를 직접 확인하시기 바랍니다.</li>
              <li>서비스의 정보를 맹신하여 발생한 불이익(불합격, 착오 지원 등)에 대해 서비스는 <strong>일체 책임을 지지 않습니다</strong>.</li>
              <li>합격 여부는 가산점 외에 다양한 요소(필기, 면접, 직무적합성 등)에 의해 결정됩니다.</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">제5조 (이용자의 의무)</h2>
          <p className="mb-2 text-sm">이용자는 다음 행위를 해서는 안 됩니다.</p>
          <ul className="list-disc list-inside space-y-1.5 text-sm">
            <li>서비스를 악의적으로 이용하거나 타인의 정보를 도용하는 행위</li>
            <li>서비스의 운영을 방해하거나 서버에 과부하를 주는 행위</li>
            <li>서비스에서 제공하는 정보를 무단으로 상업적 목적에 이용하는 행위</li>
            <li>허위 정보를 입력하여 서비스를 이용하는 행위</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">제6조 (서비스 중단)</h2>
          <p className="leading-relaxed text-sm">
            서비스는 시스템 점검, 기술적 문제, 운영상 필요에 따라 사전 고지 없이 서비스를 일시 중단하거나
            종료할 수 있습니다. 다만, 사전에 충분한 고지가 가능한 경우 공지사항을 통해 안내합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">제7조 (저작권)</h2>
          <p className="leading-relaxed text-sm">
            서비스가 작성한 콘텐츠(UI, 매칭 알고리즘, 데이터 가공 등)의 저작권은 서비스에 귀속됩니다.
            단, 공기업 가산점 원본 데이터는 해당 공기업 또는 공공기관에 귀속됩니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">제8조 (분쟁 해결)</h2>
          <p className="leading-relaxed text-sm">
            서비스 이용과 관련하여 분쟁이 발생한 경우 대한민국 법률을 적용하며,
            관할 법원은 민사소송법에 따른 법원으로 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">제9조 (약관의 변경)</h2>
          <p className="leading-relaxed text-sm">
            약관을 변경할 경우 적용 7일 전 서비스 내 공지사항을 통해 고지합니다.
            본 약관은 {LAST_UPDATED}부터 적용됩니다.
          </p>
        </section>

      </div>

      <div className="mt-10 pt-6 border-t border-gray-200 flex gap-4 text-sm">
        <Link href="/privacy" className="text-blue-600 hover:underline">개인정보 처리방침</Link>
        <Link href="/" className="text-gray-500 hover:underline">홈으로</Link>
      </div>
    </div>
  )
}
