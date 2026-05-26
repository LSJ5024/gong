import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '개인정보 처리방침 — 공기업 가산점 추천',
}

const LAST_UPDATED = '2026년 5월 27일'

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link href="/" className="text-sm text-blue-600 hover:underline mb-6 inline-block">
        ← 홈으로
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">개인정보 처리방침</h1>
      <p className="text-sm text-gray-400 mb-8">최종 업데이트: {LAST_UPDATED}</p>

      <div className="prose prose-sm max-w-none space-y-8 text-gray-700">

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">1. 개인정보 수집 항목 및 목적</h2>
          <p className="leading-relaxed">
            공기업 가산점 추천 서비스(이하 '서비스')는 맞춤형 공기업 추천 제공을 위해 다음과 같은 개인정보를 수집합니다.
          </p>
          <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-700 border-b border-gray-200">항목</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-700 border-b border-gray-200">목적</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-700 border-b border-gray-200">보유 기간</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-3">이메일 주소</td>
                  <td className="px-4 py-3">회원 식별, 로그인, 알림 발송</td>
                  <td className="px-4 py-3">회원 탈퇴 시까지</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">이름</td>
                  <td className="px-4 py-3">서비스 내 식별</td>
                  <td className="px-4 py-3">회원 탈퇴 시까지</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">학력·전공·자격증·어학성적</td>
                  <td className="px-4 py-3">공기업 가산점 매칭 및 추천</td>
                  <td className="px-4 py-3">회원 탈퇴 시까지</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-red-700 font-medium">보훈·장애 해당 여부</td>
                  <td className="px-4 py-3">특별 가산점 매칭</td>
                  <td className="px-4 py-3">회원 탈퇴 즉시 삭제</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">소셜 로그인 식별자 (카카오·구글)</td>
                  <td className="px-4 py-3">OAuth 인증</td>
                  <td className="px-4 py-3">회원 탈퇴 시까지</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">2. 민감정보 처리 방침</h2>
          <p className="leading-relaxed">
            보훈(취업지원대상자) 및 장애인 여부는 개인정보보호법 제23조에 따른 민감정보에 해당합니다.
            해당 정보는 다음과 같이 보호됩니다.
          </p>
          <ul className="mt-3 list-disc list-inside space-y-1.5 text-sm">
            <li>데이터베이스 저장 시 AES-256 암호화 적용</li>
            <li>서비스 로그에 절대 기록되지 않습니다</li>
            <li>제3자에게 일체 제공하지 않습니다</li>
            <li>회원 탈퇴 즉시 복구 불가능한 방식으로 즉시 삭제됩니다</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">3. 개인정보 제3자 제공</h2>
          <p className="leading-relaxed">
            서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.
            다만 다음의 경우는 예외로 합니다.
          </p>
          <ul className="mt-3 list-disc list-inside space-y-1.5 text-sm">
            <li>이용자가 사전에 동의한 경우</li>
            <li>법령에 의거하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">4. 개인정보 처리 위탁</h2>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-700 border-b border-gray-200">수탁업체</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-700 border-b border-gray-200">위탁 업무</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-3">Supabase Inc.</td>
                  <td className="px-4 py-3">데이터베이스 호스팅 및 인증</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Vercel Inc.</td>
                  <td className="px-4 py-3">서비스 호스팅</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Resend Inc.</td>
                  <td className="px-4 py-3">이메일 알림 발송</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">5. 이용자의 권리</h2>
          <p className="leading-relaxed">
            이용자는 언제든지 다음의 권리를 행사할 수 있습니다.
          </p>
          <ul className="mt-3 list-disc list-inside space-y-1.5 text-sm">
            <li>개인정보 열람 요청 — 마이페이지에서 직접 확인 가능</li>
            <li>개인정보 정정·삭제 요청 — 마이페이지 프로필 수정 또는 이메일 문의</li>
            <li>처리 정지 요청 — 회원 탈퇴를 통해 모든 처리 중단</li>
          </ul>
          <p className="mt-3 text-sm">문의: <a href="mailto:privacy@example.com" className="text-blue-600 hover:underline">privacy@example.com</a></p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">6. 개인정보 보호책임자</h2>
          <ul className="list-none space-y-1 text-sm">
            <li>이름: 서비스 운영팀</li>
            <li>이메일: <a href="mailto:privacy@example.com" className="text-blue-600 hover:underline">privacy@example.com</a></li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">7. 고지 의무</h2>
          <p className="leading-relaxed text-sm">
            본 방침은 {LAST_UPDATED}부터 적용되며, 내용 변경 시 서비스 내 공지사항을 통해 사전 고지합니다.
          </p>
        </section>

      </div>
    </div>
  )
}
