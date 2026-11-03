import React from 'react';
import StickSoldier from './StickSoldier';

/**
 * 하위호환 래퍼 — v1.4.1 의 '달리는 졸라맨'. 이제 막대병(StickSoldier)의 기본 모습이다.
 * 새 코드는 StickSoldier 를 직접 쓴다.
 */
export default function StickRunner(props) {
  return <StickSoldier skin="run" {...props} />;
}
