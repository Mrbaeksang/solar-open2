import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" className="not-found">
      <span aria-hidden="true">404</span>
      <h1>이 페이지는 교과서 범위 밖이에요.</h1>
      <p>주소를 다시 확인하거나 첫 챕터에서 시작해 주세요.</p>
      <Link href="/" className="button button-primary">
        홈으로 돌아가기
      </Link>
    </main>
  );
}
