/**
 * 홈 아이콘 배지 톤 — 바로가기(QuickActions)와 다가오는 일정(Upcoming)이 같은 표를 쓴다.
 * 예전엔 두 파일에 같은 객체가 복사돼 있어, 한쪽만 고치면 홈 안에서 톤이 어긋났다.
 * 색은 테마 토큰에서만 — 하드코딩 hex 금지 (다크모드).
 */
export function homeTones(tc) {
  return {
    primary: { fg: tc.primary, bg: tc.primarySoft },
    accent: { fg: tc.accentText, bg: tc.accentSoft },
    success: { fg: tc.success, bg: tc.successSoft },
    neutral: { fg: tc.textSecondary, bg: tc.surfaceSunken },
  };
}
