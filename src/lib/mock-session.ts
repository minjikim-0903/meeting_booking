/**
 * Google 로그인을 아직 붙이지 않은 상태에서도 로그인된 것처럼 동작을
 * 확인할 수 있도록 프론트엔드에서만 사용하는 가짜 로그인 사용자.
 * 예약 요청/받은 요청 API는 서버에서 실제 NextAuth 세션을 확인하므로,
 * 이 값은 화면 표시용일 뿐 실제 서버 요청을 인증시키지는 못한다.
 */
export const MOCK_USER = {
  name: "김민지",
  email: "alswlkim96@gmail.com",
  image: null as string | null,
  role: "프로덕트 디자이너" as const,
  team: "서비스5팀" as const,
}
