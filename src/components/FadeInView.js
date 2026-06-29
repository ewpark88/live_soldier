import React, { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * 가볍게 떠오르며 나타나는 진입 애니메이션 래퍼.
 * 과하지 않게 — 살짝 페이드 + 아래에서 위로 살짝 이동.
 *
 * @param {number} delay     시작 지연(ms). 목록을 순차로 띄울 때 인덱스*40 정도 권장
 * @param {number} offset    시작 시 아래로 내려둘 거리(px). 기본 10
 * @param {number} duration  지속 시간(ms). 기본 360
 */
export default function FadeInView({
  children,
  delay = 0,
  offset = 10,
  duration = 360,
  style,
  ...rest
}) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(t, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [t, delay, duration]);

  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] });

  return (
    <Animated.View
      style={[{ opacity: t, transform: [{ translateY }] }, style]}
      {...rest}
    >
      {children}
    </Animated.View>
  );
}
