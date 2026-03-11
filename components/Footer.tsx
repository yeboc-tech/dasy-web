import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* 상단: 링크 그룹 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">서비스</h3>
            <ul className="space-y-2">
              <li><Link href="/worksheet-group" className="text-sm text-gray-500 hover:text-gray-700">학습지</Link></li>
              <li><Link href="/exams" className="text-sm text-gray-500 hover:text-gray-700">기출문제</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">법적 고지</h3>
            <ul className="space-y-2">
              <li><a href="/terms.html" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-gray-700">이용약관</a></li>
              <li><a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-gray-700">개인정보처리방침</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">고객센터</h3>
            <ul className="space-y-2">
              <li><span className="text-sm text-gray-500">1599-8884</span></li>
              <li><span className="text-sm text-gray-500">FAX : 02-562-0000</span></li>
              <li><span className="text-sm text-gray-500">오전 10시 ~ 오후 10시</span></li>
              <li><span className="text-xs text-gray-400">(주말, 공휴일 제외)</span></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">회사</h3>
            <ul className="space-y-2">
              <li><span className="text-sm text-gray-500">주식회사 예보크</span></li>
              <li><span className="text-sm text-gray-500">대표이사 : 민성원</span></li>
              <li><a href="mailto:minlab@daum.net" className="text-sm text-gray-500 hover:text-gray-700">minlab@daum.net</a></li>
            </ul>
          </div>
        </div>

        {/* 하단: 회사 정보 + 카피라이트 */}
        <div className="border-t border-gray-200 pt-6 text-xs text-gray-400 space-y-1">
          <p>업체명 : 주식회사 예보크 | 사업자등록번호 : 277-87-02439 | 통신판매사업자 신고번호 : 2024-서울강남-03821</p>
          <p>학원설립 운영등록번호 : 제 14270호 예보크학원 | 개인정보관리책임자 : 강호중</p>
          <p>주소 : 서울 강남구 삼성로 72길 3, 비1층</p>
          <p className="pt-2">COPYRIGHT &copy; 2022 주식회사 예보크 ALL RIGHTS RESERVED.</p>
        </div>
      </div>
    </footer>
  );
}
