/**
 * 홈 위젯에 표시할 데이터 계산 (활성 프로필 기준).
 * AsyncStorage만 읽으므로 헤드리스(위젯 태스크) 컨텍스트에서도 동작한다.
 */
import { listProfiles, loadRankPromotions } from '../utils/storage';
import {
  calcDaysLeft, calcProgress, calcServedDays,
  calcRank, calcRankFromPromotions, formatDateKo,
} from '../utils/dateUtils';
import { isOfficer, personnelLabel } from '../constants/serviceTerms';

export async function getWidgetData() {
  try {
    const { activeId, profiles } = await listProfiles();
    const active = profiles.find((p) => p.id === activeId) || profiles[0];
    const mi = active?.militaryInfo;

    if (!mi || !mi.dischargeDate) {
      return { empty: true, name: active?.name ?? '' };
    }

    const daysLeft = calcDaysLeft(mi.dischargeDate);
    const progress = calcProgress(mi.enlistDate, mi.dischargeDate);
    // 손상된 날짜로 NaN이 나오면 위젯에 깨진 값이 그려지지 않도록 빈 상태로 처리
    if (!Number.isFinite(daysLeft) || !Number.isFinite(progress)) {
      return { empty: true, name: active?.name ?? '' };
    }
    const officer  = isOfficer(mi.personnelType);

    let rank;
    if (officer) {
      rank = mi.officerRank ?? personnelLabel(mi.personnelType);
    } else {
      const promotions = await loadRankPromotions(mi.enlistDate);
      rank = calcRankFromPromotions(promotions) ?? calcRank(calcServedDays(mi.enlistDate));
    }

    const ddayText = daysLeft > 0 ? `D-${daysLeft}` : daysLeft === 0 ? 'D-DAY' : '전역';

    return {
      empty: false,
      name: active?.name ?? '',
      ddayText,
      progress,
      rank,
      dischargeText: formatDateKo(mi.dischargeDate),
    };
  } catch {
    return { empty: true, name: '' };
  }
}
