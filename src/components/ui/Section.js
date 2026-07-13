import React from 'react';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { space } from '../../theme/tokens';
import { useMotion } from '../../hooks/useMotion';

/**
 * 세로 리듬의 유일한 주인.
 *
 * 화면의 각 섹션은 이걸로 감싼다. 자식은 자기 marginTop/marginBottom 을
 * 절대 갖지 않는다. 간격을 여러 군데서 관리하면 반드시 이중·삼중으로 쌓여
 * "섹션 간격이 들쭉날쭉"해진다 — 그래서 주인을 하나로 못 박는다.
 *
 * 덤으로 진입 스태거도 여기서 처리한다. index 를 넘기면 순서대로 떠오른다.
 */
export default function Section({ index = 0, gap = space.lg, style, children, ...rest }) {
  const m = useMotion();
  return (
    <Animated.View
      entering={m.enter(FadeInUp, index)}
      style={[{ marginBottom: gap }, style]}
      {...rest}
    >
      {children}
    </Animated.View>
  );
}
