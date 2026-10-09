import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Chip, Field } from '@/components/ui';
import { newId, Tea, useTeas } from '@/lib/teas';
import { C, TEA_TYPES, TYPE_COLORS, TeaType } from '@/lib/theme';

type SteepDraft = { min: string; sec: string };

const toNum = (v: string) => Number(v.replace(',', '.'));

export default function EditTea() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { teas, save } = useTeas();
  const existing = teas.find((t) => t.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [type, setType] = useState<TeaType>(existing?.type ?? 'Čierny');
  const [origin, setOrigin] = useState(existing?.origin ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [tasting, setTasting] = useState(existing?.tasting ?? '');
  const [baseMl, setBaseMl] = useState(String(existing?.baseMl ?? 250));
  const [baseGrams, setBaseGrams] = useState(String(existing?.baseGrams ?? 3).replace('.', ','));
  const [tempC, setTempC] = useState(String(existing?.tempC ?? 95));
  const [steeps, setSteeps] = useState<SteepDraft[]>(
    existing?.steeps.map((s) => ({ min: String(Math.floor(s / 60)), sec: String(s % 60) })) ?? [{ min: '3', sec: '0' }],
  );
  const [steps, setSteps] = useState(existing?.steps ?? '');
  const [error, setError] = useState('');

  const updateSteep = (i: number, patch: Partial<SteepDraft>) =>
    setSteeps(steeps.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const onSave = () => {
    const ml = toNum(baseMl);
    const g = toNum(baseGrams);
    const temp = toNum(tempC);
    if (!name.trim()) return setError('Zadaj názov čaju.');
    if (!(ml > 0) || !(g > 0)) return setError('Množstvo vody a čaju musí byť kladné číslo.');
    if (!(temp > 0 && temp <= 100)) return setError('Teplota musí byť medzi 1 a 100 °C.');

    const tea: Tea = {
      id: existing?.id ?? newId(),
      name: name.trim(),
      type,
      origin: origin.trim(),
      description: description.trim(),
      tasting: tasting.trim(),
      baseMl: ml,
      baseGrams: g,
      tempC: temp,
      steeps: steeps
        .map((s) => (toNum(s.min) || 0) * 60 + (toNum(s.sec) || 0))
        .filter((sec) => sec > 0)
        .map(Math.round),
      steps: steps.trim(),
    };
    save(tea);
    if (existing) router.back();
    else router.replace({ pathname: '/caj/[id]', params: { id: tea.id } });
  };

  return (
    <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: existing ? 'Upraviť čaj' : 'Nový čaj' }} />

      <Field label="Názov" value={name} onChangeText={setName} placeholder="napr. Darjeeling First Flush" />

      <View style={{ gap: 8 }}>
        <Text style={s.label}>Druh</Text>
        <View style={s.wrap}>
          {TEA_TYPES.map((t) => (
            <Chip key={t} label={t} color={TYPE_COLORS[t]} active={type === t} onPress={() => setType(t)} />
          ))}
        </View>
      </View>

      <Field label="Pôvod" value={origin} onChangeText={setOrigin} placeholder="napr. India, Darjeeling" />
      <Field
        label="Popis"
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="Aký je to čaj, kedy ho rada piješ…"
      />
      <Field
        label="Čo v ňom cítiť"
        value={tasting}
        onChangeText={setTasting}
        placeholder="oddeľ čiarkou: med, kvety, broskyňa"
      />

      <View style={s.row}>
        <Field label="Voda (ml)" value={baseMl} onChangeText={setBaseMl} inputMode="numeric" containerStyle={{ flex: 1 }} />
        <Field label="Čaj (g)" value={baseGrams} onChangeText={setBaseGrams} inputMode="decimal" containerStyle={{ flex: 1 }} />
        <Field label="Teplota °C" value={tempC} onChangeText={setTempC} inputMode="numeric" containerStyle={{ flex: 1 }} />
      </View>

      <View style={{ gap: 8 }}>
        <Text style={s.label}>Časy nálevov</Text>
        {steeps.map((st, i) => (
          <View key={i} style={s.steepRow}>
            <Text style={s.steepIdx}>{i + 1}.</Text>
            <TextInput
              value={st.min}
              onChangeText={(v) => updateSteep(i, { min: v })}
              inputMode="numeric"
              style={s.smallInput}
            />
            <Text style={s.unit}>min</Text>
            <TextInput
              value={st.sec}
              onChangeText={(v) => updateSteep(i, { sec: v })}
              inputMode="numeric"
              style={s.smallInput}
            />
            <Text style={s.unit}>s</Text>
            <Pressable onPress={() => setSteeps(steeps.filter((_, j) => j !== i))} hitSlop={8} style={{ marginLeft: 'auto' }}>
              <Text style={{ color: C.danger, fontSize: 15 }}>Odobrať</Text>
            </Pressable>
          </View>
        ))}
        <Button title="+ Pridať nálev" variant="soft" onPress={() => setSteeps([...steeps, { min: '0', sec: '30' }])} />
      </View>

      <Field
        label="Postup prípravy"
        value={steps}
        onChangeText={setSteps}
        multiline
        placeholder={'Každý krok na nový riadok\nNahrej konvičku\nZalej vodou…'}
        style={{ minHeight: 140 }}
      />

      {!!error && <Text style={s.error}>{error}</Text>}
      <Button title="Uložiť" onPress={onSave} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { padding: 18, paddingBottom: 60, gap: 18, maxWidth: 640, width: '100%', alignSelf: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: C.textSoft, textTransform: 'uppercase', letterSpacing: 0.6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', gap: 10 },
  steepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  steepIdx: { color: C.textSoft, width: 22, fontSize: 15 },
  smallInput: {
    width: 56,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 10,
    textAlign: 'center',
    fontSize: 16,
    color: C.text,
  },
  unit: { color: C.textSoft, fontSize: 15 },
  error: { color: C.danger, fontSize: 15, textAlign: 'center' },
});
