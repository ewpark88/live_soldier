import { useMemo } from 'react';
import { useStreak } from '../state/StreakContext';
import { pickDaily, dayIndex } from '../utils/daily';
import { getMessageForPhase } from '../utils/dateUtils';
import { TIPS, TRIVIA, KIND_META } from '../constants/dailyContent';

/**
 * 매일 바뀌는 히어로 콘텐츠.
 *
 * 날짜는 StreakContext 의 `today` 를 쓴다 (앱 전역 단일 진실 원천). 각 화면이
 * 각자 new Date() 를 부르면 앱을 켜둔 채 자정을 넘겼을 때 화면마다 날짜가
 * 어긋난다.
 *
 * salt 를 요소별로 다르게 줘서 메시지·팁·각도가 한 몸처럼 굴러가지 않게 한다.
 */
const ANGLES = ['diagonal', 'vertical', 'reverse'];

export function useDailyHero(phase) {
  const { today } = useStreak();

  return useMemo(() => {
    const kind = dayIndex(today) % 2 === 0 ? 'tip' : 'trivia';
    const pool = kind === 'tip' ? TIPS : TRIVIA;

    return {
      dateStr: today,
      message: getMessageForPhase(phase, today),
      subline: pickDaily(pool, today, 'sub'),
      sublineKind: kind,
      sublineMeta: KIND_META[kind],
      // 색을 새로 만들지 않고도 매일 다른 인상을 준다
      heroAngle: pickDaily(ANGLES, today, 'angle') ?? 'diagonal',
    };
  }, [today, phase]);
}

export default useDailyHero;
