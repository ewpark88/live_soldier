import { useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';

/**
 * 지금이 하루 중 어느 때인가 — 히어로 배경의 "살아있는" 부분.
 *
 * 색은 여기 없다. `src/theme/palettes/base.js` 의 `DAYPART_WASH` 가 갖고 있고,
 * `npm run theme:check` 가 **워시를 합성한 뒤의** 그라데이션 위에서 D-Day 숫자
 * 대비를 검사한다. 이 훅은 "언제"만 답한다.
 *
 * 분 단위로만 갱신한다 — 초 단위로 돌 이유가 없고, 화면이 보이지 않으면
 * 타이머 자체를 멈춘다 (LiveServiceGauge 와 같은 규칙).
 */
export function daypartOf(d = new Date()) {
  const h = d.getHours();
  if (h < 5) return 'night';
  if (h < 8) return 'dawn';
  if (h < 11) return 'morning';
  if (h < 17) return 'noon';
  if (h < 20) return 'dusk';
  return 'night';
}

export function useDaypart() {
  const isFocused = useIsFocused();
  const [part, setPart] = useState(() => daypartOf());

  useEffect(() => {
    if (!isFocused) return undefined;
    setPart(daypartOf());
    const id = setInterval(() => setPart(daypartOf()), 60000);
    return () => clearInterval(id);
  }, [isFocused]);

  return part;
}

export default useDaypart;
