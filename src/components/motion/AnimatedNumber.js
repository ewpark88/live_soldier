import React, { useEffect } from 'react';
import { TextInput } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { motion, tabular } from '../../theme/tokens';
import { useMotion } from '../../hooks/useMotion';

/**
 * 숫자 카운트업.
 *
 * Text 가 아니라 TextInput 을 애니메이션한다. Reanimated 는 TextInput 의 text 프롭을
 * UI 스레드에서 직접 갈아끼울 수 있어서, 프레임마다 JS로 setState 하지 않아도 된다.
 * (Text 로 하면 1200ms 동안 초당 60번 리렌더가 난다.)
 */
Animated.addWhitelistedNativeProps({ text: true });
const AnimatedInput = Animated.createAnimatedComponent(TextInput);

/**
 * 천 단위 콤마.
 * UI 스레드(worklet)와 JS 스레드 양쪽에서 부른다 — 'worklet' 지시어가 있어도
 * JS 에서 그냥 함수로 호출하는 건 문제없다.
 */
function format(n, comma) {
  'worklet';
  const neg = n < 0;
  const s = String(Math.abs(n));
  if (!comma) return (neg ? '-' : '') + s;

  let out = '';
  let c = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    out = s[i] + out;
    c += 1;
    if (c % 3 === 0 && i > 0) out = ',' + out;
  }
  return (neg ? '-' : '') + out;
}

/**
 * @param value      목표 숫자
 * @param from       시작 숫자 (기본 0)
 * @param comma      천 단위 콤마
 * @param replayKey  값이 바뀌면 처음부터 다시 센다 (홈 D-N 탭 재생용)
 */
export default function AnimatedNumber({
  value = 0,
  from = 0,
  duration = motion.duration.count,
  comma = false,
  prefix = '',
  suffix = '',
  replayKey = 0,
  style,
  ...rest
}) {
  const m = useMotion();
  const sv = useSharedValue(from);

  // 값이 실제로 바뀔 때만 다시 센다. 리렌더마다 재생하면 멀미난다.
  useEffect(() => {
    sv.value = from;
    sv.value = withTiming(value, {
      duration: m.dur(duration),
      easing: Easing.bezier(...motion.bezier.emphasis),
    });
  }, [value, replayKey, duration, m.reduced]);

  const animatedProps = useAnimatedProps(() => ({
    text: prefix + format(Math.round(sv.value), comma) + suffix,
  }));

  /**
   * 레이아웃 폭은 "최종값"으로 잰다.
   *
   * animatedProps 의 text 는 UI 스레드에서 매 프레임 갈아끼워지지만, Yoga 가
   * TextInput 폭을 재는 건 React 가 렌더한 props 기준이다. 여기에 시작값("0")을
   * 주면 한 자리 폭으로 측정돼서 "1,250,000" 이 잘려 나간다.
   * 최종 문자열을 defaultValue 로 주면 처음부터 다 들어갈 폭으로 잡힌다.
   * (tabular-nums 라 자릿수만 같으면 폭이 흔들리지 않는다.)
   */
  const finalText = prefix + format(Math.round(value), comma) + suffix;

  return (
    <AnimatedInput
      editable={false}
      pointerEvents="none"
      underlineColorAndroid="transparent"
      allowFontScaling={false}
      defaultValue={finalText}
      accessibilityRole="text"
      accessibilityLabel={finalText}
      animatedProps={animatedProps}
      style={[
        tabular,
        { padding: 0, includeFontPadding: false, textAlignVertical: 'center' },
        style,
      ]}
      {...rest}
    />
  );
}
