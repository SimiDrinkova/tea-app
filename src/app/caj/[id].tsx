import { router, Stack, useLocalSearchParams, useNavigation } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, SectionTitle } from '@/components/ui';
import {
  formatGrams,
  formatHours,
  formatTime,
  isLowStock,
  newId,
  useTeas,
} from '@/lib/teas';
import { goHome } from '@/lib/nav';
import { C, serif, TYPE_COLORS } from '@/lib/theme';
import { confirmAction, startSteepTimer } from '@/lib/timer';

const PRESETS = [100, 150, 200, 250, 300, 400, 500];
const COLD_PRESETS = [250, 300, 400, 500, 700, 1000];
const MAX_TIMER_HOURS = 24; // časovač v iPhone ide najviac do 23:59:59

export default function TeaDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { teas, loaded, remove, update, save } = useTeas();
  const tea = teas.find((t) => t.id === id);
  const [ml, setMl] = useState<number | null>(null);
  const [cold, setCold] = useState(false);
  const [lastUsed, setLastUsed] = useState<number | null>(null);
  const navigation = useNavigation();

  if (!loaded) return null;
  if (!tea) {
    return (
      <View style={{ padding: 24, gap: 16 }}>
        <Text style={s.body}>Tento čaj sa nenašiel.</Text>
        <Button title="Späť na zoznam" onPress={() => goHome(navigation.canGoBack())} />
      </View>
    );
  }

  const isCold = cold && !!tea.coldBrew;
  const recipe = isCold && tea.coldBrew ? tea.coldBrew : tea;
  const volume = ml ?? recipe.baseMl;
  const grams = Math.max(1, Math.round((recipe.baseGrams * volume) / recipe.baseMl));
  const color = TYPE_COLORS[tea.type];
  const notes = tea.tasting.split(',').map((n) => n.trim()).filter(Boolean);
  const steps = recipe.steps.split('\n').map((n) => n.trim()).filter(Boolean);
  const presets = Array.from(new Set([...(isCold ? COLD_PRESETS : PRESETS), recipe.baseMl])).sort((a, b) => a - b);
  const low = isLowStock(tea);

  const switchMode = (next: boolean) => {
    setCold(next);
    setMl(null);
  };

  const markUsed = () => {
    if (tea.stockGrams === undefined) return;
    const used = Math.min(grams, tea.stockGrams);
    update(tea.id, { stockGrams: Math.round((tea.stockGrams - used) * 10) / 10 });
    setLastUsed(used);
  };

  const undoUse = () => {
    if (tea.stockGrams === undefined || lastUsed === null) return;
    update(tea.id, { stockGrams: Math.round((tea.stockGrams + lastUsed) * 10) / 10 });
    setLastUsed(null);
  };

  const duplicate = () => {
    const copy = { ...tea, id: newId(), name: `${tea.name} (kópia)`, favorite: false, stockGrams: undefined };
    save(copy);
    router.replace({ pathname: '/upravit', params: { id: copy.id } });
  };

  return (
    <ScrollView contentContainerStyle={s.page}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable
                onPress={() => update(tea.id, { favorite: !tea.favorite })}
                hitSlop={10}
                accessibilityLabel={tea.favorite ? 'Odobrať z obľúbených' : 'Pridať medzi obľúbené'}>
                <Text style={[s.heart, tea.favorite && { color: C.danger }]}>{tea.favorite ? '♥' : '♡'}</Text>
              </Pressable>
              <Pressable onPress={() => router.push({ pathname: '/upravit', params: { id: tea.id } })} hitSlop={10}>
                <Text style={s.headerLink}>Upraviť</Text>
              </Pressable>
            </View>
          ),
        }}
      />

      <View style={{ gap: 6 }}>
        <View style={[s.badge, { backgroundColor: color }]}>
          <Text style={s.badgeText}>{tea.type}</Text>
        </View>
        <Text style={s.title}>{tea.name}</Text>
        {!!tea.origin && <Text style={s.origin}>{tea.origin}</Text>}
        <View style={s.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              hitSlop={4}
              accessibilityLabel={`Hodnotenie ${n} z 5`}
              onPress={() => update(tea.id, { rating: tea.rating === n ? undefined : n })}>
              <Text style={[s.star, n <= (tea.rating ?? 0) && { color: '#D49A2A' }]}>★</Text>
            </Pressable>
          ))}
        </View>
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

      {!!tea.coldBrew && (
        <View style={s.segment}>
          {[
            { label: '☕ Horúci', value: false },
            { label: '🧊 Cold brew', value: true },
          ].map((o) => (
            <Pressable
              key={o.label}
              onPress={() => switchMode(o.value)}
              style={[s.segmentBtn, isCold === o.value && { backgroundColor: color }]}>
              <Text style={[s.segmentText, isCold === o.value && { color: '#FFF' }]}>{o.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Card style={{ gap: 14 }}>
        <SectionTitle>{isCold ? 'Koľko cold brew si chceš pripraviť?' : 'Koľko si chceš pripraviť?'}</SectionTitle>
        <View style={s.stepper}>
          <Pressable style={s.stepBtn} onPress={() => setMl(Math.max(50, volume - 50))}>
            <Text style={s.stepBtnText}>−</Text>
          </Pressable>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={s.bigNumber}>{formatVolume(volume)}</Text>
            <Text style={[s.bigNumber, { color }]}>{grams} g</Text>
          </View>
          <Pressable style={s.stepBtn} onPress={() => setMl(volume + 50)}>
            <Text style={s.stepBtnText}>+</Text>
          </Pressable>
        </View>
        <View style={s.wrap}>
          {presets.map((p) => (
            <Chip key={p} label={formatVolume(p)} active={p === volume} color={color} onPress={() => setMl(p)} />
          ))}
        </View>
        <View style={s.params}>
          {isCold && tea.coldBrew ? (
            <Param label="V chladničke" value={formatHours(tea.coldBrew.hours)} />
          ) : (
            <Param label="Teplota" value={`${tea.tempC} °C`} />
          )}
          <Param label="Pomer" value={`${formatGrams(recipe.baseGrams)} / ${recipe.baseMl} ml`} />
        </View>
      </Card>

      {!isCold && tea.steeps.length > 0 && (
        <Card style={{ gap: 10 }}>
          <SectionTitle>Lúhovanie</SectionTitle>
          {tea.steeps.map((sec, i) => (
            <View key={i} style={s.steepRow}>
              <Text style={s.body}>
                {i + 1}. nálev · <Text style={{ fontWeight: '700' }}>{formatTime(sec)}</Text>
              </Text>
              <TimerButton color={color} onPress={() => startSteepTimer(sec)} />
            </View>
          ))}
          <Text style={s.hint}>Časovač beží v iPhone cez Skratku a zazvoní aj pri zamknutom telefóne.</Text>
        </Card>
      )}

      {isCold && tea.coldBrew && (
        <Card style={{ gap: 10 }}>
          <SectionTitle>Lúhovanie v chladničke</SectionTitle>
          <View style={s.steepRow}>
            <Text style={s.body}>
              Hotové o <Text style={{ fontWeight: '700' }}>{formatHours(tea.coldBrew.hours)}</Text>
            </Text>
            {tea.coldBrew.hours < MAX_TIMER_HOURS && (
              <TimerButton color={color} onPress={() => startSteepTimer(Math.round(tea.coldBrew!.hours * 3600))} />
            )}
          </View>
          <Text style={s.hint}>
            {tea.coldBrew.hours < MAX_TIMER_HOURS
              ? 'iPhone ti zazvoní, keď bude cold brew hotový.'
              : 'Časovač v iPhone ide najviac 24 hodín, na dlhšie lúhovanie si nastav budík.'}
          </Text>
        </Card>
      )}

      {steps.length > 0 && (
        <View>
          <SectionTitle>{isCold ? 'Postup – cold brew' : 'Postup prípravy'}</SectionTitle>
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

      {tea.stockGrams !== undefined ? (
        <Card style={[{ gap: 12 }, low && s.lowCard]}>
          <View style={s.steepRow}>
            <SectionTitle>Zásoba</SectionTitle>
            <Text style={[s.stock, low && { color: C.danger }]}>{formatGrams(tea.stockGrams)}</Text>
          </View>
          {low && (
            <Text style={[s.hint, { color: C.danger }]}>
              {tea.stockGrams === 0
                ? 'Čaj ti došiel, čas objednať nový.'
                : `Dochádza ti, zostáva už len ${formatGrams(tea.stockGrams)}. Čas objednať nový.`}
            </Text>
          )}
          <Button
            title={`Pripravila som – odpočítať ${Math.min(grams, tea.stockGrams)} g`}
            variant="soft"
            onPress={markUsed}
          />
          {lastUsed !== null && (
            <Pressable onPress={undoUse} hitSlop={8}>
              <Text style={[s.hint, { textAlign: 'center' }]}>
                Odpočítané {lastUsed} g · <Text style={{ color: C.accent, fontWeight: '700' }}>Vrátiť</Text>
              </Text>
            </Pressable>
          )}
        </Card>
      ) : (
        <Pressable onPress={() => router.push({ pathname: '/upravit', params: { id: tea.id } })}>
          <Text style={[s.hint, { textAlign: 'center' }]}>
            Chceš sledovať, koľko ti ho ostáva? <Text style={{ color: C.accent, fontWeight: '700' }}>Nastaviť zásobu</Text>
          </Text>
        </Pressable>
      )}

      <View style={{ gap: 10, marginTop: 12 }}>
        <Button title="Duplikovať čaj" variant="soft" onPress={duplicate} />
        <Button
          title="Vymazať čaj"
          variant="danger"
          onPress={() =>
            confirmAction(`Naozaj vymazať „${tea.name}“?`, () => {
              remove(tea.id);
              goHome(navigation.canGoBack());
            })
          }
        />
      </View>
    </ScrollView>
  );
}

function formatVolume(ml: number) {
  return ml >= 1000 ? `${String(ml / 1000).replace('.', ',')} l` : `${ml} ml`;
}

function TimerButton({ color, onPress }: { color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.timerBtn, { backgroundColor: color }, pressed && { opacity: 0.8 }]}>
      <Text style={s.timerBtnText}>⏱ Spustiť</Text>
    </Pressable>
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
  heart: { fontSize: 24, color: C.accent, paddingHorizontal: 6 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  title: { fontFamily: serif, fontSize: 34, color: C.text },
  origin: { color: C.textSoft, fontSize: 15 },
  stars: { flexDirection: 'row', gap: 4, marginTop: 2 },
  star: { fontSize: 26, color: '#DCCDB8' },
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
  segment: { flexDirection: 'row', backgroundColor: C.chip, borderRadius: 999, padding: 4, gap: 4 },
  segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  segmentText: { fontSize: 15, fontWeight: '600', color: C.accent },
  steepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timerBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  timerBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  hint: { color: C.textSoft, fontSize: 13, lineHeight: 19 },
  stock: { fontFamily: serif, fontSize: 24, color: C.text, marginBottom: 10 },
  lowCard: { borderColor: '#E3B7AE', backgroundColor: '#FBF0EC' },
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
