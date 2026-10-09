import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, SectionTitle } from '@/components/ui';
import { formatGrams, formatTime, useTeas } from '@/lib/teas';
import { C, serif, TYPE_COLORS } from '@/lib/theme';
import { confirmAction, startSteepTimer } from '@/lib/timer';

const PRESETS = [100, 150, 200, 250, 300, 400, 500];

export default function TeaDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { teas, loaded, remove } = useTeas();
  const tea = teas.find((t) => t.id === id);
  const [ml, setMl] = useState<number | null>(null);

  if (!loaded) return null;
  if (!tea) {
    return (
      <View style={{ padding: 24, gap: 16 }}>
        <Text style={s.body}>Tento čaj sa nenašiel.</Text>
        <Button title="Späť na zoznam" onPress={() => router.replace('/')} />
      </View>
    );
  }

  const volume = ml ?? tea.baseMl;
  const grams = Math.max(1, Math.round((tea.baseGrams * volume) / tea.baseMl));
  const color = TYPE_COLORS[tea.type];
  const notes = tea.tasting.split(',').map((n) => n.trim()).filter(Boolean);
  const steps = tea.steps.split('\n').map((n) => n.trim()).filter(Boolean);
  const presets = Array.from(new Set([...PRESETS, tea.baseMl])).sort((a, b) => a - b);

  return (
    <ScrollView contentContainerStyle={s.page}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Pressable onPress={() => router.push({ pathname: '/upravit', params: { id: tea.id } })} hitSlop={10}>
              <Text style={s.headerLink}>Upraviť</Text>
            </Pressable>
          ),
        }}
      />

      <View style={{ gap: 6 }}>
        <View style={[s.badge, { backgroundColor: color }]}>
          <Text style={s.badgeText}>{tea.type}</Text>
        </View>
        <Text style={s.title}>{tea.name}</Text>
        {!!tea.origin && <Text style={s.origin}>{tea.origin}</Text>}
      </View>

      {!!tea.description && <Text style={s.body}>{tea.description}</Text>}

      {notes.length > 0 && (
        <View>
          <SectionTitle>Čo v ňom cítiť</SectionTitle>
          <View style={s.wrap}>
            {notes.map((n) => (
              <Chip key={n} label={n} />
            ))}
          </View>
        </View>
      )}

      <Card style={{ gap: 14 }}>
        <SectionTitle>Koľko si chceš pripraviť?</SectionTitle>
        <View style={s.stepper}>
          <Pressable style={s.stepBtn} onPress={() => setMl(Math.max(50, volume - 50))}>
            <Text style={s.stepBtnText}>−</Text>
          </Pressable>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={s.bigNumber}>{volume} ml</Text>
            <Text style={[s.bigNumber, { color }]}>{grams} g</Text>
          </View>
          <Pressable style={s.stepBtn} onPress={() => setMl(volume + 50)}>
            <Text style={s.stepBtnText}>+</Text>
          </Pressable>
        </View>
        <View style={s.wrap}>
          {presets.map((p) => (
            <Chip key={p} label={`${p} ml`} active={p === volume} color={color} onPress={() => setMl(p)} />
          ))}
        </View>
        <View style={s.params}>
          <Param label="Teplota" value={`${tea.tempC} °C`} />
          <Param label="Pomer" value={`${formatGrams(tea.baseGrams)} / ${tea.baseMl} ml`} />
        </View>
      </Card>

      {tea.steeps.length > 0 && (
        <Card style={{ gap: 10 }}>
          <SectionTitle>Lúhovanie</SectionTitle>
          {tea.steeps.map((sec, i) => (
            <View key={i} style={s.steepRow}>
              <Text style={s.body}>
                {i + 1}. nálev · <Text style={{ fontWeight: '700' }}>{formatTime(sec)}</Text>
              </Text>
              <Pressable
                onPress={() => startSteepTimer(sec)}
                style={({ pressed }) => [s.timerBtn, { backgroundColor: color }, pressed && { opacity: 0.8 }]}>
                <Text style={s.timerBtnText}>⏱ Spustiť</Text>
              </Pressable>
            </View>
          ))}
          <Text style={s.hint}>Časovač beží v iPhone cez Skratku a zazvoní aj pri zamknutom telefóne.</Text>
        </Card>
      )}

      {steps.length > 0 && (
        <View>
          <SectionTitle>Postup prípravy</SectionTitle>
          <View style={{ gap: 12 }}>
            {steps.map((step, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[s.stepNum, { borderColor: color }]}>
                  <Text style={[s.stepNumText, { color }]}>{i + 1}</Text>
                </View>
                <Text style={[s.body, { flex: 1 }]}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <Button
        title="Vymazať čaj"
        variant="danger"
        style={{ marginTop: 12 }}
        onPress={() =>
          confirmAction(`Naozaj vymazať „${tea.name}“?`, () => {
            remove(tea.id);
            router.back();
          })
        }
      />
    </ScrollView>
  );
}

function Param({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={s.paramLabel}>{label}</Text>
      <Text style={s.paramValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  page: { padding: 18, paddingBottom: 60, gap: 22, maxWidth: 640, width: '100%', alignSelf: 'center' },
  headerLink: { color: C.accent, fontSize: 16, fontWeight: '600', paddingHorizontal: 12 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  title: { fontFamily: serif, fontSize: 34, color: C.text },
  origin: { color: C.textSoft, fontSize: 15 },
  body: { color: C.text, fontSize: 16, lineHeight: 24 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontSize: 26, color: C.accent },
  bigNumber: { fontFamily: serif, fontSize: 30, color: C.text },
  params: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 },
  paramLabel: { fontSize: 12, color: C.textSoft, textTransform: 'uppercase', letterSpacing: 0.6 },
  paramValue: { fontSize: 16, color: C.text, fontWeight: '600' },
  steepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timerBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  timerBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  hint: { color: C.textSoft, fontSize: 13 },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontWeight: '700', fontSize: 14 },
});
