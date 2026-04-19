import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal,
  StyleSheet, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../constants/colors';
import { formatDate, formatDateKo } from '../utils/dateUtils';

/**
 * 날짜 선택 컴포넌트
 * - Android : 네이티브 캘린더 다이얼로그
 * - iOS     : 하단 모달 스피너
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
}) {
  const [show, setShow] = useState(false);

  // value가 있으면 해당 날짜, 없으면 오늘
  const currentDate = value ? new Date(value) : new Date();

  // Android: 캘린더 다이얼로그에서 선택/취소
  const handleAndroidChange = (event, selectedDate) => {
    setShow(false);
    if (event.type === 'set' && selectedDate) {
      onChange(formatDate(selectedDate));
    }
  };

  // iOS: 스피너 스크롤 중 실시간 반영
  const handleIOSChange = (event, selectedDate) => {
    if (selectedDate) {
      onChange(formatDate(selectedDate));
    }
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      {/* 날짜 선택 버튼 */}
      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={() => { if (!disabled) setShow(true); }}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={styles.calIcon}>{disabled ? '🔒' : '📅'}</Text>
        <Text style={[styles.valueText, !value && styles.placeholder, disabled && styles.textDisabled]}>
          {value ? formatDateKo(value) : placeholder}
        </Text>
        {!disabled && <Text style={styles.arrow}>›</Text>}
      </TouchableOpacity>

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
          onRequestClose={() => setShow(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShow(false)}
          />
          <View style={styles.modalBox}>
            {/* 헤더 */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShow(false)}>
                <Text style={styles.cancelBtn}>취소</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>날짜 선택</Text>
              <TouchableOpacity onPress={() => setShow(false)}>
                <Text style={styles.doneBtn}>완료</Text>
              </TouchableOpacity>
            </View>

            {/* 스피너 */}
            <DateTimePicker
              value={currentDate}
              mode="date"
              display="spinner"
              onChange={handleIOSChange}
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

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  buttonDisabled: {
    backgroundColor: '#F0F0F0',
    borderColor: '#D0D0D0',
  },
  textDisabled: {
    color: COLORS.textSecondary,
  },
  calIcon: {
    fontSize: 20,
  },
  valueText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  placeholder: {
    color: COLORS.textLight,
    fontWeight: '400',
  },
  arrow: {
    fontSize: 20,
    color: COLORS.textLight,
  },
  // iOS 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalBox: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  cancelBtn: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  doneBtn: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  spinner: {
    height: 200,
  },
});
