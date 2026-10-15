import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import {
  Screen, AppHeader, Section, Card, Button, TextField, Txt, EmptyState, SectionTitle,
} from '../components/ui';
import { AD_UNITS } from '../constants/adUnits';
import { useThemeColors } from '../theme/ThemeContext';
import { radius as r, space as sp, type as ty } from '../theme/tokens';
import { loadShareSource, calcDefaultPromotions } from '../utils/storage';
import { encodeShareCode, shareCodeUrl } from '../utils/shareCode';
import { buildFamilyShareMessage } from '../utils/shareUtils';
import { calcDaysLeft, formatDateKo } from '../utils/dateUtils';
import { haptic } from '../utils/haptics';

let Clipboard = null;
try { Clipboard = require('expo-clipboard'); } catch (e) {}

/**
 * 가족·곰신에게 공유 — 보내는 쪽 화면.
 *
 * 서버가 없으니 '계정 연결'이 아니라 '정보 복사'다. 전역일 계산에 필요한 최소한
 * (입대일·군별·신분·복무개월, 직접 고친 진급일)만 코드에 담고, 휴가·일정·급여는
 * 담지 않는다. 받는 사람은 앱에서 그 코드로 프로필을 하나 만든다.
 *
 * 전달 경로 셋:
 *   1) 카톡 등으로 메시지 보내기 — 메시지 통째로 붙여넣어도 받는 쪽이 코드를 찾는다
 *   2) 코드만 복사
 *   3) 마주 앉아 있으면 QR — 폰 기본 카메라로 찍으면 앱이 열린다
 */
export default function ShareProfileScreen() {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const [src, setSrc] = useState(undefined);   // undefined = 로딩
  const [name, setName] = useState('');

  useFocusEffect(useCallback(() => {
    let alive = true;
    loadShareSource().then((v) => {
      if (!alive) return;
      setSrc(v);
      setName(v?.name ?? '');
    }).catch(() => alive && setSrc(null));
    return () => { alive = false; };
  }, []));

  const code = useMemo(() => {
    if (!src?.militaryInfo) return null;
    // 기본 진급일과 같으면 싣지 않는다 — 받는 쪽도 같은 값을 계산하고, 코드가 짧아진다
    const def = calcDefaultPromotions(src.militaryInfo.enlistDate);
    const p = src.promotions;
    const custom = p && def && (p.일병 !== def.일병 || p.상병 !== def.상병 || p.병장 !== def.병장) ? p : null;
    return encodeShareCode({ name: name.trim(), militaryInfo: src.militaryInfo, promotions: custom });
  }, [src, name]);

  const left = src?.militaryInfo ? calcDaysLeft(src.militaryInfo.dischargeDate) : null;

  const sendMessage = async () => {
    if (!code) return;
    try {
      await Share.share({ message: buildFamilyShareMessage(name.trim(), src.militaryInfo, code) });
    } catch (e) { /* 취소 */ }
  };

  const copy = async () => {
    if (!code) return;
    try {
      await Clipboard.setStringAsync(code);
      haptic.success();
      Alert.alert('복사했어요', '받는 사람 앱의 프로필 추가 → \'공유 코드로 추가\'에 붙여넣으면 돼요.');
    } catch (e) {
      Alert.alert('복사 실패', '코드를 길게 눌러 직접 복사해 주세요.');
    }
  };

  const header = <AppHeader title="가족에게 공유" subtitle="곰신·부모님과 전역일 함께 세기" back />;

  if (src === undefined) return <Screen standalone scroll={false} header={header} />;

  if (!code) {
    return (
      <Screen standalone header={header}>
        <EmptyState
          icon="people-outline"
          title="먼저 입대 정보를 입력해 주세요"
          desc="입대일과 군별이 있어야 공유 코드를 만들 수 있어요."
        />
      </Screen>
    );
  }

  return (
    <Screen standalone ad={AD_UNITS.SHARE_BOTTOM} header={header}>
      <Section index={0}>
        <Card>
          <View style={s.intro}>
            <View style={s.introIcon}>
              <Ionicons name="heart" size={20} color={tc.primary} />
            </View>
            <View style={{ flex: 1, gap: sp.xxs }}>
              <Txt role="bodyLg" style={{ fontWeight: '800' }}>
                {formatDateKo(src.militaryInfo.dischargeDate)} 전역{left > 0 ? ` · D-${left}` : ''}
              </Txt>
              <Txt role="caption" tone="secondary">
                받는 사람의 앱에 이 전역일이 프로필로 추가돼요. 위젯·알림도 그쪽에서 그대로 동작해요.
              </Txt>
            </View>
          </View>
        </Card>
      </Section>

      <Section index={1}>
        <TextField
          label="받는 사람에게 보일 이름"
          value={name}
          onChangeText={setName}
          placeholder="예) 민준, 우리 아들"
          maxLength={12}
          hint="이름을 바꾸면 코드도 바뀌어요."
        />
      </Section>

      <Section index={2}>
        <Card>
          <SectionTitle icon="key-outline">공유 코드</SectionTitle>
          <Txt
            selectable
            numeric
            style={s.code}
            accessibilityLabel={`공유 코드 ${code}`}
          >
            {code}
          </Txt>
          <View style={s.btnCol}>
            <Button title="메시지로 보내기" icon="paper-plane-outline" onPress={sendMessage} full />
            {Clipboard ? (
              <Button title="코드만 복사" icon="copy-outline" variant="secondary" onPress={copy} full />
            ) : null}
          </View>
        </Card>
      </Section>

      <Section index={3}>
        <Card>
          <SectionTitle icon="qr-code-outline">옆에 있다면 QR 로</SectionTitle>
          <Txt role="caption" tone="secondary" style={s.qrHint}>
            상대방 폰의 기본 카메라로 찍으면 '전역까지' 앱이 열려요. (앱이 설치되어 있어야 해요)
          </Txt>
          <View style={[s.qrBox, { backgroundColor: tc.qrBg }]}>
            <QRCode value={shareCodeUrl(code)} size={196} color={tc.qrFg} backgroundColor={tc.qrBg} ecl="M" />
          </View>
        </Card>
      </Section>

      <Section index={4}>
        <Card variant="flat">
          {[
            ['1', '받는 사람이 Play 스토어에서 \'전역까지\'를 설치해요.'],
            ['2', '프로필 바의 \'추가\' → \'공유 코드로 추가\'를 눌러요.'],
            ['3', '받은 메시지를 붙여넣으면 끝! 진급일을 고쳤다면 코드를 다시 보내 주세요.'],
          ].map(([n, t]) => (
            <View key={n} style={s.step}>
              <View style={s.stepNum}><Txt role="label" tone="primary">{n}</Txt></View>
              <Txt role="bodySm" tone="secondary" style={{ flex: 1 }}>{t}</Txt>
            </View>
          ))}
          <Txt role="caption" tone="light" style={s.privacy}>
            * 휴가·일정·급여·사진은 공유되지 않아요. 코드는 서버를 거치지 않고 메시지로만 전달돼요.
          </Txt>
        </Card>
      </Section>
    </Screen>
  );
}

const makeStyles = (tc) =>
  StyleSheet.create({
    intro: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
    introIcon: {
      width: 44, height: 44, borderRadius: r.md,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: tc.primarySoft,
    },
    code: {
      ...ty.bodyLg,
      fontWeight: '800',
      color: tc.text,
      marginTop: sp.md,
      padding: sp.md,
      borderRadius: r.sm,
      backgroundColor: tc.surfaceSunken,
      letterSpacing: 0.5,
    },
    btnCol: { gap: sp.sm, marginTop: sp.md },
    qrHint: { marginTop: sp.sm },
    qrBox: { alignSelf: 'center', padding: sp.lg, borderRadius: r.md, marginTop: sp.md },
    step: { flexDirection: 'row', alignItems: 'flex-start', gap: sp.md, paddingVertical: sp.xs },
    stepNum: {
      width: 24, height: 24, borderRadius: r.pill,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: tc.primarySoft,
    },
    privacy: { marginTop: sp.md },
  });
