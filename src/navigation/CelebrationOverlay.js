import React, { useEffect, useState } from 'react';
import MilestoneCelebration from '../components/MilestoneCelebration';
import { useCelebration } from '../state/CelebrationContext';
import { loadMilitaryInfo, loadRankPromotions, listProfiles } from '../utils/storage';
import { shareMilestone } from '../utils/shareUtils';
import {
  calcDaysLeft, calcServedDays, calcRank, calcRankFromPromotions,
} from '../utils/dateUtils';
import { isOfficer, personnelLabel } from '../constants/serviceTerms';

/**
 * 축하 오버레이 어댑터.
 *
 * 컨텍스트가 "무엇을 축하할지"만 정하고, 공유 문구에 필요한 계급·이름은
 * 여기서 한 번만 읽는다. MilestoneCelebration 은 순수 프레젠테이션으로 남는다.
 */
export default function CelebrationOverlay() {
  const { pending, unlockedTheme, dismiss } = useCelebration();
  const [ctx, setCtx] = useState(null);

  useEffect(() => {
    if (!pending) { setCtx(null); return; }
    let alive = true;
    (async () => {
      const info = await loadMilitaryInfo();
      if (!info) return;
      const promos = await loadRankPromotions(info.enlistDate);
      const served = calcServedDays(info.enlistDate);
      const rank = isOfficer(info.personnelType)
        ? (info.officerRank ?? personnelLabel(info.personnelType))
        : (calcRankFromPromotions(promos) ?? calcRank(served));

      let name = '';
      try {
        const { activeId, profiles } = await listProfiles();
        name = profiles.find((p) => p.id === activeId)?.name ?? '';
      } catch (e) {}

      if (alive) setCtx({ info, rank, name, daysLeft: calcDaysLeft(info.dischargeDate) });
    })();
    return () => { alive = false; };
  }, [pending]);

  if (!pending || !ctx) return null;

  return (
    <MilestoneCelebration
      visible
      milestone={pending}
      unlockedTheme={unlockedTheme}
      daysLeft={ctx.daysLeft}
      onShare={() => shareMilestone(ctx.info, pending, ctx.rank, ctx.name)}
      onClose={dismiss}
    />
  );
}
