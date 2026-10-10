import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { DEFAULT_LIMIT, loadLimit } from '@/lib/caffeine';
import { dayLabel, formatGrams, sumCaffeine, useTeas } from '@/lib/teas';
import { C, serif, TYPE_COLORS } from '@/lib/theme';
import { confirmAction } from '@/lib/timer';

export default function History() {
  const { teas, update } = useTeas();
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  useEffect(() => {
    loadLimit().then(setLimit);
  }, []);

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
  const today = days[0]?.label === 'Dnes' ? days[0].items : [];
  const todayMg = sumCaffeine(today);
  const ratio = Math.min(1, todayMg / limit);
  const over = todayMg > limit;

  return (
    <ScrollView contentContainerStyle={s.page}>
      <Card style={{ gap: 10 }}>
        <View style={s.todayHead}>
          <Text style={s.todayTitle}>Kofeín dnes</Text>
          <Text style={[s.todayMg, over && { color: C.danger }]}>
            ≈ {todayMg} <Text style={s.todayOf}>z {limit} mg</Text>
          </Text>
        </View>
        <View style={s.bar}>
          <View
            style={[
              s.barFill,
              { width: `${Math.max(ratio * 100, todayMg ? 3 : 0)}%` },
              ratio > 0.75 && { backgroundColor: '#C9852E' },
              over && { backgroundColor: C.danger },
            ]}
          />
        </View>
        <Text style={s.soft}>
          {over
            ? `Dnes si prekročila odporúčané maximum o ≈ ${todayMg - limit} mg.`
            : todayMg
              ? `Do odporúčaného maxima ti zostáva ≈ ${limit - todayMg} mg.`
              : 'Dnes si ešte nepila čaj s kofeínom.'}{' '}
          Odporúčanie: {limit === 200 ? 'v tehotenstve a pri dojčení' : 'pre dospelých'} do {limit} mg denne (EFSA).
          Hodnoty sú len orientačný odhad.
        </Text>
      </Card>

      {total === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: 32, gap: 6 }}>
          <Text style={{ fontSize: 40 }}>🕘</Text>
          <Text style={s.emptyTitle}>Zatiaľ žiadna história</Text>
          <Text style={[s.soft, { textAlign: 'center' }]}>
            Keď pri čaji spustíš časovač 1. nálevu alebo cold brew, appka si to zapíše aj s gramami a odhadom kofeínu.
          </Text>
        </Card>
      ) : (
        <Text style={s.soft}>Spolu {total}× · zapisuje sa samo pri spustení 1. nálevu alebo cold brew časovača.</Text>
      )}

      {days.map((day) => (
        <View key={day.label} style={{ gap: 8 }}>
          <View style={s.dayHead}>
            <Text style={s.day}>{day.label}</Text>
            <Text style={s.dayMg}>≈ {sumCaffeine(day.items)} mg kofeínu</Text>
          </View>
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
                        {formatGrams(item.grams)} · ≈ {item.caffeineMg ?? 0} mg
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
  dayHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  dayMg: { color: C.textSoft, fontSize: 13 },
  todayHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  todayTitle: { fontFamily: serif, fontSize: 19, color: C.text },
  todayMg: { fontFamily: serif, fontSize: 24, color: C.text },
  todayOf: { fontSize: 15, color: C.textSoft },
  bar: { height: 10, borderRadius: 5, backgroundColor: C.chip, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5, backgroundColor: C.olive },
  delete: { color: C.textSoft, fontSize: 22, paddingHorizontal: 4 },
});
