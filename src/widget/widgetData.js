/**
 * 홈 위젯에 표시할 데이터 계산 (활성 프로필 기준).
 * AsyncStorage만 읽으므로 헤드리스(위젯 태스크) 컨텍스트에서도 동작한다.
 */
import { listProfiles, loadRankPromotions, loadThemeSettings, loadLeaveRecords } from '../utils/storage';
import { getNextLeave } from '../utils/upcoming';
import { resolvePalette } from '../theme/palettes';
import {
  calcDaysLeft, calcProgress,
  calcRankByEnlistDate, calcRankFromPromotions, formatDateKo,
} from '../utils/dateUtils';
import { isOfficer, personnelLabel } from '../constants/serviceTerms';

/**
 * 위젯에 넘길 색 — 팔레트 전체가 아니라 5키 서브셋만.
 *
 * 항상 dark 팔레트를 쓴다. 위젯은 배경화면 위에 앉고, 헤드리스 컨텍스트에서
 * Appearance 는 신뢰할 수 없다. heroFrom 을 배경으로 쓰면 위젯이 곧 앱 히어로의
 * 축소판이 되어 정체성이 일치한다.
 *
 * (`src/theme/palettes/*` 는 런타임 라이브러리 import 가 0 이라 여기서 안전하다.)
 */
async function getWidgetTheme() {
  try {
    const { themeId } = await loadThemeSettings();
    const p = resolvePalette(themeId, 'dark');
    return {
      bg: p.heroFrom,
      accent: p.phase.normal.accent,
      text: p.heroText,
      muted: p.heroTextMuted,
      track: 'rgba(255,255,255,0.22)',
    };
  } catch {
    return null;   // DischargeWidget 의 폴백 상수가 받는다
  }
}

export async function getWidgetData() {
  try {
    const { activeId, profiles } = await listProfiles();
    const active = profiles.find((p) => p.id === activeId) || profiles[0];
    const mi = active?.militaryInfo;

    const theme = await getWidgetTheme();

    if (!mi || !mi.dischargeDate) {
      return { empty: true, name: active?.name ?? '', theme };
    }

    const daysLeft = calcDaysLeft(mi.dischargeDate);
    const progress = calcProgress(mi.enlistDate, mi.dischargeDate);
    // 손상된 날짜로 NaN이 나오면 위젯에 깨진 값이 그려지지 않도록 빈 상태로 처리
    if (!Number.isFinite(daysLeft) || !Number.isFinite(progress)) {
      return { empty: true, name: active?.name ?? '', theme };
    }
    const officer  = isOfficer(mi.personnelType);

    let rank;
    if (officer) {
      rank = mi.officerRank ?? personnelLabel(mi.personnelType);
    } else {
      const promotions = await loadRankPromotions(mi.enlistDate);
      rank = calcRankFromPromotions(promotions) ?? calcRankByEnlistDate(mi.enlistDate);
    }

    const ddayText = daysLeft > 0 ? `D-${daysLeft}` : daysLeft === 0 ? 'D-DAY' : '전역';

    // 다음 휴가 한 줄 — 전역 전만. 휴가 중이면 '복귀까지'가 더 궁금하다.
    let leaveText = '';
    if (daysLeft > 0) {
      try {
        const next = getNextLeave(await loadLeaveRecords());
        if (next?.state === 'ongoing') {
          leaveText = next.returnDday > 0 ? `휴가 ${next.dayNo}일차 · 복귀 D-${next.returnDday}` : '휴가 마지막 날';
        } else if (next?.state === 'upcoming') {
          leaveText = next.dday === 1 ? '내일 휴가 출발' : `다음 휴가 D-${next.dday}`;
        }
      } catch (e) { /* 휴가 줄은 부가 정보 — 실패해도 위젯은 그린다 */ }
    }

    return {
      empty: false,
      name: active?.name ?? '',
      ddayText,
      progress,
      rank,
      dischargeText: formatDateKo(mi.dischargeDate),
      leaveText,
      theme,
    };
  } catch {
    return { empty: true, name: '' };
  }
}
