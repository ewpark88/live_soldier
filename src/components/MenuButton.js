import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/ThemeContext';
import AppMenu from './AppMenu';

/**
 * 우상단 햄버거 버튼. 자체적으로 AppMenu(슬라이드 메뉴) 열림 상태를 관리한다.
 *
 * @param {object} navigation  react-navigation 객체
 * @param {string} current     현재 화면 route name
 * @param {string} color       아이콘 색 (기본 primary)
 * @param {object} style       버튼 래퍼 스타일
 */
export default function MenuButton({ navigation, current, color, style }) {
  const tc = useThemeColors();
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={style}
        activeOpacity={0.6}
      >
        <Ionicons name="menu" size={27} color={color || tc.primary} />
      </TouchableOpacity>
      <AppMenu
        visible={open}
        onClose={() => setOpen(false)}
        navigation={navigation}
        current={current}
      />
    </>
  );
}
