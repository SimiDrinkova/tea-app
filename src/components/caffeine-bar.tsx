import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DEFAULT_LIMIT, loadLimit } from '@/lib/caffeine';
import { caffeineToday, Tea } from '@/lib/teas';
import { C } from '@/lib/theme';

// Kompaktný prehľad kofeínu na hlavnej obrazovke; ťuknutím otvorí Históriu.
export function CaffeineBar({ teas }: { teas: Tea[] }) {
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  // Načítať znova po návrate z Nastavení, kde sa limit dá zmeniť.
  useFocusEffect(
    useCallback(() => {
      loadLimit().then(setLimit);
    }, []),
  );

  const mg = caffeineToday(teas);
  const ratio = Math.min(1, mg / limit);
  const over = mg > limit;
  const fill = over ? C.danger : ratio > 0.75 ? '#C9852E' : C.olive;

  return (
    <Pressable
      onPress={() => router.push('/historia')}
      accessibilityLabel={`Kofeín dnes približne ${mg} z ${limit} miligramov`}
      style={({ pressed }) => [s.box, pressed && { opacity: 0.8 }]}>
      <View style={s.row}>
        <Text style={s.label}>☕ Kofeín dnes</Text>
        <Text style={[s.value, over && { color: C.danger }]}>
          ≈ {mg} <Text style={s.of}>/ {limit} mg</Text>
        </Text>
      </View>
      <View style={s.bar}>
        <View style={[s.fill, { width: `${Math.max(ratio * 100, mg ? 3 : 0)}%`, backgroundColor: fill }]} />
      </View>
      {over && <Text style={s.warn}>Prekročila si odporúčané maximum o ≈ {mg - limit} mg.</Text>}
    </Pressable>
  );
}

const s = StyleSheet.create({
  box: { gap: 8, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  label: { color: C.text, fontSize: 15, fontWeight: '600' },
  value: { color: C.text, fontSize: 16, fontWeight: '700' },
  of: { color: C.textSoft, fontSize: 13, fontWeight: '400' },
  bar: { height: 8, borderRadius: 4, backgroundColor: C.chip, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  warn: { color: C.danger, fontSize: 13 },
});
