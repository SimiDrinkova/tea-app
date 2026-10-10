import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { dayLabel, formatGrams, useTeas } from '@/lib/teas';
import { C, serif, TYPE_COLORS } from '@/lib/theme';
import { confirmAction } from '@/lib/timer';

export default function History() {
  const { teas, update } = useTeas();

  // Všetky pitia zo všetkých čajov, zoskupené po dňoch, najnovšie hore.
  const days = useMemo(() => {
    const all = teas.flatMap((tea) => (tea.drunk ?? []).map((d) => ({ tea, ...d })));
    all.sort((a, b) => b.at.localeCompare(a.at));
    const groups: { label: string; items: typeof all }[] = [];
    for (const item of all) {
      const label = dayLabel(item.at);
      const last = groups[groups.length - 1];
      if (last?.label === label) last.items.push(item);
      else groups.push({ label, items: [item] });
    }
    return groups;
  }, [teas]);

  const total = days.reduce((n, d) => n + d.items.length, 0);

  return (
    <ScrollView contentContainerStyle={s.page}>
      {total === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: 32, gap: 6 }}>
          <Text style={{ fontSize: 40 }}>🕘</Text>
          <Text style={s.emptyTitle}>Zatiaľ žiadna história</Text>
          <Text style={[s.soft, { textAlign: 'center' }]}>
            Keď pri čaji spustíš časovač 1. nálevu alebo cold brew, appka si to zapíše.
          </Text>
        </Card>
      ) : (
        <Text style={s.soft}>Spolu {total}× · zapisuje sa samo pri spustení 1. nálevu alebo cold brew časovača.</Text>
      )}

      {days.map((day) => (
        <View key={day.label} style={{ gap: 8 }}>
          <Text style={s.day}>{day.label}</Text>
          <Card style={{ padding: 6 }}>
            {day.items.map((item, i) => (
              <View key={item.tea.id + item.at} style={[s.row, i > 0 && s.rowBorder]}>
                <Pressable
                  style={s.rowMain}
                  onPress={() => router.push({ pathname: '/caj/[id]', params: { id: item.tea.id } })}>
                  <View style={[s.dot, { backgroundColor: TYPE_COLORS[item.tea.type] }]} />
                  <Text style={s.name} numberOfLines={1}>
                    {item.tea.name}
                    {item.cold ? ' 🧊' : ''}
                  </Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.time}>
                      {new Date(item.at).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {item.grams !== undefined && (
                      <Text style={s.meta}>
                        {item.ml} ml · {formatGrams(item.grams)}
                      </Text>
                    )}
                  </View>
                </Pressable>
                <Pressable
                  hitSlop={10}
                  accessibilityLabel="Vymazať z histórie"
                  onPress={() =>
                    confirmAction(`Vymazať „${item.tea.name}“ z histórie (${day.label.toLowerCase()})?`, () =>
                      update(item.tea.id, { drunk: (item.tea.drunk ?? []).filter((d) => d.at !== item.at) }),
                    )
                  }>
                  <Text style={s.delete}>×</Text>
                </Pressable>
              </View>
            ))}
          </Card>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { padding: 18, paddingBottom: 60, gap: 18, maxWidth: 640, width: '100%', alignSelf: 'center' },
  soft: { color: C.textSoft, fontSize: 14, lineHeight: 20 },
  emptyTitle: { fontFamily: serif, fontSize: 20, color: C.text },
  day: { fontFamily: serif, fontSize: 19, color: C.text },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, gap: 10 },
  rowBorder: { borderTopWidth: 1, borderTopColor: C.border },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  name: { flex: 1, color: C.text, fontSize: 16 },
  time: { color: C.textSoft, fontSize: 14 },
  meta: { color: C.textSoft, fontSize: 12 },
  delete: { color: C.textSoft, fontSize: 22, paddingHorizontal: 4 },
});
