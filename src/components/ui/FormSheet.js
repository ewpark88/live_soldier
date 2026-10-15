import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import BottomSheet from '../motion/BottomSheet';
import Txt from './Txt';
import Button from './Button';
import { space as sp } from '../../theme/tokens';

/**
 * 바텀시트 입력 폼의 공용 골격 — 제목 · 필드들 · [취소 | 저장].
 *
 * 휴가·일정이 같은 골격(ScrollView + 제목 + formLabel 마진 + 버튼 행)을 각자
 * 갖고 있었다. 필드 사이 간격은 여기의 gap 하나가 준다 — 필드는 마진을 갖지 않는다.
 *
 * @param onSubmit     저장 버튼
 * @param submitLabel  기본 '저장'
 * @param saving       저장 중 로딩 표시 (연타 차단은 호출부의 savingRef 가 맡는다)
 */
export default function FormSheet({
  visible,
  onClose,
  title,
  onSubmit,
  submitLabel = '저장',
  submitVariant = 'primary',
  saving = false,
  submitDisabled = false,
  children,
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView
        style={styles.scroll}   // 시트 maxHeight·키보드에 맞춰 줄어들며 스크롤
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {title ? <Txt role="subtitle" style={styles.title}>{title}</Txt> : null}
        <View style={styles.fields}>{children}</View>
        <View style={styles.btns}>
          <Button title="취소" variant="ghost" onPress={onClose} style={styles.btn} />
          <Button
            title={submitLabel}
            variant={submitVariant}
            onPress={onSubmit}
            loading={saving}
            disabled={submitDisabled}
            style={styles.btn}
          />
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  title: { marginBottom: sp.lg },
  fields: { gap: sp.lg },
  btns: { flexDirection: 'row', gap: sp.sm, marginTop: sp.xl },
  btn: { flex: 1 },
});
