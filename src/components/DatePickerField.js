import React, { useState, useMemo } from 'react';
import {
  View, Text, Pressable, Modal,
  StyleSheet, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PressScale from './ui/PressScale';
import { FIELD_HEIGHT } from './ui/TextField';
import { useThemeColors } from '../theme/ThemeContext';
import { radius as r, space as sp, type as ty } from '../theme/tokens';
import { formatDate, formatDateKo, parseDate } from '../utils/dateUtils';

/**
 * 날짜 선택 컴포넌트
 * - Android : 네이티브 캘린더 다이얼로그
 * - iOS     : 하단 모달 스피너 (완료를 눌러야 반영 — 취소하면 원래 값 유지)
 *
 * 생김새는 TextField 와 같다 (높이 48 · 반경 sm · 같은 라벨). 예전엔 패딩 16 으로
 * 높이가 ~53 이라 옆에 놓인 48 버튼과 바닥선이 어긋났다.
 *
 * @param {string}   label       - 필드 레이블
 * @param {string}   value       - 'YYYY-MM-DD' 형식 현재 값
 * @param {function} onChange    - (dateString: 'YYYY-MM-DD') => void
 * @param {Date}     minimumDate - 선택 가능 최소 날짜
 * @param {Date}     maximumDate - 선택 가능 최대 날짜
 * @param {string}   placeholder - 미선택 상태 텍스트
 */
export default function DatePickerField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  placeholder = '날짜를 선택하세요',
  disabled = false,
  style,
}) {
  const tc = useThemeColors();
  const styles = useMemo(() => makeStyles(tc), [tc]);
  const insets = useSafeAreaInsets();
  const [show, setShow] = useState(false);
  // iOS 스피너는 굴리는 동안 값이 바뀐다. 예전엔 그걸 바로 onChange 로 흘려서
  // '취소'를 눌러도 바뀐 값이 남았다 — 초안에 담아 두고 '완료'에서만 반영한다.
  const [draft, setDraft] = useState(null);

  // value가 있으면 해당 날짜, 없으면 오늘
  const currentDate = parseDate(value) ?? new Date();

  // Android: 캘린더 다이얼로그에서 선택/취소
  const handleAndroidChange = (event, selectedDate) => {
    setShow(false);
    if (event.type === 'set' && selectedDate) {
      onChange(formatDate(selectedDate));
    }
  };

  const openIOS = () => { setDraft(currentDate); setShow(true); };
  const cancelIOS = () => { setShow(false); setDraft(null); };
  const doneIOS = () => {
    if (draft) onChange(formatDate(draft));
    setShow(false);
    setDraft(null);
  };

  const open = () => {
    if (disabled) return;
    if (Platform.OS === 'ios') openIOS(); else setShow(true);
  };

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label} maxFontSizeMultiplier={1.3}>{label}</Text> : null}

      {/* 날짜 선택 버튼 */}
      <PressScale
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={open}
        disabled={disabled}
        haptic="select"
        tint={!disabled}
        tintRadius={r.sm}
        accessibilityRole="button"
        accessibilityLabel={`${label ? `${label}, ` : ''}${value ? formatDateKo(value) : placeholder}`}
        accessibilityHint={disabled ? undefined : '날짜를 고르는 창을 엽니다'}
        accessibilityState={{ disabled }}
      >
        <Ionicons
          name={disabled ? 'lock-closed-outline' : 'calendar-outline'}
          size={18}
          color={disabled ? tc.textSecondary : tc.primary}
        />
        <Text
          style={[styles.valueText, !value && styles.placeholder, disabled && styles.textDisabled]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.4}
        >
          {value ? formatDateKo(value) : placeholder}
        </Text>
        {!disabled && <Ionicons name="chevron-down" size={18} color={tc.textLight} />}
      </PressScale>

      {/* Android: 네이티브 다이얼로그 (UI는 OS가 처리) */}
      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display="calendar"
          onChange={handleAndroidChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate ?? new Date(2040, 11, 31)}
          locale="ko-KR"
        />
      )}

      {/* iOS: 하단 모달 스피너 */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={show}
          transparent
          animationType="slide"
          onRequestClose={cancelIOS}
        >
          {/* 배경 딤은 '눌리는 표면'이 아니다 — 축소도 햅틱도 없어야 한다 */}
          <Pressable style={styles.modalOverlay} onPress={cancelIOS} accessibilityLabel="닫기" />
          {/* 고정 32 는 홈 인디케이터 영역(34)보다 작아 스피너 하단이 가렸다 */}
          <View style={[styles.modalBox, { paddingBottom: insets.bottom + sp.lg }]}>
            <View style={styles.modalHeader}>
              <PressScale onPress={cancelIOS} haptic="light" style={styles.headerBtn} accessibilityRole="button">
                <Text style={styles.cancelBtn}>취소</Text>
              </PressScale>
              <Text style={styles.modalTitle}>날짜 선택</Text>
              <PressScale onPress={doneIOS} haptic="success" style={styles.headerBtn} accessibilityRole="button">
                <Text style={styles.doneBtn}>완료</Text>
              </PressScale>
            </View>

            <DateTimePicker
              value={draft ?? currentDate}
              mode="date"
              display="spinner"
              onChange={(e, d) => { if (d) setDraft(d); }}
              minimumDate={minimumDate}
              maximumDate={maximumDate ?? new Date(2040, 11, 31)}
              locale="ko-KR"
              style={styles.spinner}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

const makeStyles = (tc) => StyleSheet.create({
  // 바깥 마진 없음 — 세로 간격은 부모(Section / FormSheet gap)가 준다.
  container: { gap: sp.sm },
  label: { ...ty.label, color: tc.textSecondary },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: FIELD_HEIGHT,
    backgroundColor: tc.surfaceSunken,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tc.surfaceSunkenBorder,
    borderRadius: r.sm,
    paddingHorizontal: sp.md,
    gap: sp.sm,
  },
  buttonDisabled: { opacity: 0.6 },
  textDisabled: { color: tc.textSecondary },
  valueText: { flex: 1, ...ty.bodyLg, fontWeight: '600', color: tc.text },
  placeholder: { color: tc.textSecondary, fontWeight: '500' },
  // iOS 모달
  modalOverlay: { flex: 1, backgroundColor: tc.scrim },
  modalBox: {
    backgroundColor: tc.card,
    borderTopLeftRadius: r.lg,
    borderTopRightRadius: r.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: sp.sm,
    paddingVertical: sp.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tc.border,
  },
  headerBtn: { minWidth: 56, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { ...ty.bodyLg, fontWeight: '700', color: tc.text },
  cancelBtn: { ...ty.bodyLg, color: tc.textSecondary },
  doneBtn: { ...ty.bodyLg, fontWeight: '700', color: tc.primary },
  spinner: { height: 200 },
});
