import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';

import { C, serif } from '@/lib/theme';

export function Button({
  title,
  onPress,
  variant = 'primary',
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'soft' | 'danger';
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.btn, s[variant], pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] }, style]}>
      <Text style={[s.btnText, variant !== 'primary' && { color: variant === 'danger' ? C.danger : C.accent }]}>
        {title}
      </Text>
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  color = C.accent,
  onPress,
}: {
  label: string;
  active?: boolean;
  color?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[s.chip, active && { backgroundColor: color, borderColor: color }]}>
      <Text style={[s.chipText, active && { color: '#FFF' }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={s.section}>{children}</Text>;
}

export function Field({ label, containerStyle, ...props }: TextInputProps & { label: string; containerStyle?: ViewStyle }) {
  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      <Text style={s.label}>{label}</Text>
      <TextInput placeholderTextColor="#B9A693" {...props} style={[s.input, props.multiline && s.multiline, props.style]} />
    </View>
  );
}

const s = StyleSheet.create({
  btn: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16, alignItems: 'center' },
  primary: { backgroundColor: C.accent },
  soft: { backgroundColor: C.chip },
  danger: { backgroundColor: '#F4E1DC' },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  chipText: { color: C.text, fontSize: 14 },
  card: {
    backgroundColor: C.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    boxShadow: '0 4px 14px rgba(90, 60, 30, 0.07)',
  },
  section: { fontFamily: serif, fontSize: 19, color: C.text, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '600', color: C.textSoft, textTransform: 'uppercase', letterSpacing: 0.6 },
  input: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: C.text,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
});
