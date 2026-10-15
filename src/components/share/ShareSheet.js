import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BottomSheet, Button, Txt } from '../ui';
import ShareCard from './ShareCard';
import { useThemeColors } from '../../theme/ThemeContext';
import { space as sp } from '../../theme/tokens';
import { canShareImage, shareViewAsImage } from '../../utils/shareImage';
import { haptic } from '../../utils/haptics';

/**
 * 공유 시트 — 카드 미리보기 + [이미지로 공유] [텍스트로 공유] (+ 가족에게 코드 보내기).
 *
 * 홈 히어로의 '자랑하기', 마일스톤 축하의 '자랑하기', 스트릭 시트가 모두 쓴다.
 * 이미지 공유가 안 되는 빌드(네이티브 모듈 없음)거나 캡처가 실패하면 텍스트로 떨어진다.
 *
 * @param card       { kind, data } — ShareCard props
 * @param onText     텍스트 공유 (shareUtils 의 기존 함수)
 * @param onFamily   주면 '가족에게 공유 코드 보내기' 버튼을 보인다
 */
export default function ShareSheet({ visible, onClose, card, onText, onFamily, title = '자랑하기' }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const imageOk = canShareImage();
  // 닫힐 때 부모가 card 를 null 로 비워도, 시트가 내려가는 동안엔 마지막 카드를 그린다
  const last = useRef(null);
  if (card) last.current = { card, title, onText, onFamily };
  const cur = card ? { card, title, onText, onFamily } : last.current || {};

  const shareImage = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await shareViewAsImage(ref);
      if (!ok) {
        haptic.warning();
        await cur.onText?.();   // 캡처가 안 되면 최소한 글로라도 나간다
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
        <Txt role="subtitle" style={s.title}>{cur.title}</Txt>
        <View style={s.preview}>
          {cur.card ? <ShareCard ref={ref} kind={cur.card.kind} data={cur.card.data} /> : null}
        </View>
        <View style={s.actions}>
          {imageOk ? (
            <Button title="이미지로 공유" icon="image-outline" onPress={shareImage} loading={busy} full />
          ) : null}
          <Button
            title="텍스트로 공유"
            icon="chatbubble-ellipses-outline"
            variant={imageOk ? 'secondary' : 'primary'}
            onPress={() => cur.onText?.()}
            full
          />
          {cur.onFamily ? (
            <Button
              title="가족·곰신에게 공유 코드 보내기"
              icon="people-outline"
              variant="ghost"
              onPress={() => { const go = cur.onFamily; onClose?.(); go(); }}
              full
            />
          ) : null}
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    title: { marginBottom: sp.lg },
    preview: { alignItems: 'center' },
    actions: { gap: sp.sm, marginTop: sp.xl },
  });
