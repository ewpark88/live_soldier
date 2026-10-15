import React, { useEffect, useState } from 'react';
import MilestoneCelebration from '../components/MilestoneCelebration';
import ShareSheet from '../components/share/ShareSheet';
import { useCelebration } from '../state/CelebrationContext';
import { loadMilitaryInfo, loadRankPromotions, listProfiles } from '../utils/storage';
import { shareMilestone } from '../utils/shareUtils';
import {
  calcDaysLeft, calcProgress, calcRankByEnlistDate, calcRankFromPromotions,
} from '../utils/dateUtils';
import { BRANCHES, isOfficer, personnelLabel } from '../constants/serviceTerms';

/**
 * 축하 오버레이 어댑터.
 *
 * 컨텍스트가 "무엇을 축하할지"만 정하고, 공유 문구에 필요한 계급·이름은
 * 여기서 한 번만 읽는다. MilestoneCelebration 은 순수 프레젠테이션으로 남는다.
 *
 * '자랑하기'는 축하 모달을 닫고 공유 시트(이미지 카드 + 텍스트)를 연다.
 * 모달 두 장을 겹쳐 띄우지 않는다 — 안드로이드 뒤로가기가 어느 쪽을 닫는지
 * 헷갈리고, 축하 연출(컨페티) 위에 시트가 얹히면 지저분하다.
 */
export default function CelebrationOverlay() {
  const { pending, unlockedTheme, dismiss } = useCelebration();
  const [ctx, setCtx] = useState(null);
  const [share, setShare] = useState(null);

  useEffect(() => {
    if (!pending) { setCtx(null); return; }
    let alive = true;
    (async () => {
      const info = await loadMilitaryInfo();
      if (!info) return;
      const promos = await loadRankPromotions(info.enlistDate);
      const rank = isOfficer(info.personnelType)
        ? (info.officerRank ?? personnelLabel(info.personnelType))
        : (calcRankFromPromotions(promos) ?? calcRankByEnlistDate(info.enlistDate));

      let name = '';
      try {
        const { activeId, profiles } = await listProfiles();
        name = profiles.find((p) => p.id === activeId)?.name ?? '';
      } catch (e) {}

      if (alive) setCtx({ info, rank, name, daysLeft: calcDaysLeft(info.dischargeDate) });
    })();
    return () => { alive = false; };
  }, [pending]);

  const brag = () => {
    if (!ctx || !pending) return;
    const milestone = pending;
    const c = ctx;
    setShare({
      title: '마일스톤 자랑하기',
      kind: 'milestone',
      data: {
        name: c.name,
        branchLabel: BRANCHES.find((b) => b.key === c.info.branch)?.label ?? '',
        rank: c.rank,
        daysLeft: c.daysLeft,
        progress: calcProgress(c.info.enlistDate, c.info.dischargeDate),
        milestone: { label: milestone.label, icon: milestone.icon, date: milestone.dateStr ?? milestone.date },
      },
      onText: () => shareMilestone(c.info, milestone, c.rank, c.name),
    });
    dismiss();
  };

  return (
    <>
      {pending && ctx ? (
        <MilestoneCelebration
          visible
          milestone={pending}
          unlockedTheme={unlockedTheme}
          daysLeft={ctx.daysLeft}
          onShare={brag}
          onClose={dismiss}
        />
      ) : null}
      <ShareSheet
        visible={!!share}
        onClose={() => setShare(null)}
        title={share?.title}
        card={share}
        onText={share?.onText}
      />
    </>
  );
}
