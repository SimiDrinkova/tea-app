import { router, Stack, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Chip, SectionTitle } from '@/components/ui';
import {
  formatDate,
  formatGrams,
  formatHours,
  formatTime,
  isLowStock,
  isNewBrew,
  lastDrunkLabel,
  LogEntry,
  newId,
  originParts,
  shopHref,
  useTeas,
  withDrink,
} from '@/lib/teas';
import { goHome } from '@/lib/nav';
import { loadNextSteep, saveNextSteep } from '@/lib/session';
import { C, serif, TYPE_COLORS } from '@/lib/theme';
import { confirmAction, startSteepTimer } from '@/lib/timer';

const PRESETS = [100, 150, 200, 250, 300, 400, 500];
const COLD_PRESETS = [250, 300, 400, 500, 700, 1000];
const MAX_TIMER_HOURS = 24; // časovač v iPhone ide najviac do 23:59:59

type Mode = 'hot' | 'milk' | 'cold';

export default function TeaDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { teas, loaded, remove, update, save } = useTeas();
  const tea = teas.find((t) => t.id === id);
  const [ml, setMl] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>('hot');
  const [milkIdx, setMilkIdx] = useState(0);
  const [lastUsed, setLastUsed] = useState<number | null>(null);
  const [nextSteep, setNextSteep] = useState(0);
  const [note, setNote] = useState('');
  const [showAllLog, setShowAllLog] = useState(false);

  useEffect(() => {
    if (id) loadNextSteep(id).then(setNextSteep);
  }, [id]);
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

  const milkSections = parseMilk(tea.milkSteps ?? '');
  const milkMethods = milkSections.filter((m): m is MilkMethod => m.ml !== undefined && m.grams !== undefined);
  const milkMethod = milkMethods[Math.min(milkIdx, milkMethods.length - 1)];
  const isCold = mode === 'cold' && !!tea.coldBrew;
  const isMilk = mode === 'milk' && milkSections.length > 0;
  // Gramáž sa ráta podľa spôsobu prípravy: cold brew a čaj s mliekom majú svoj vlastný pomer.
  const recipe =
    isCold && tea.coldBrew
      ? tea.coldBrew
      : isMilk
        ? { baseMl: milkMethod?.ml ?? tea.baseMl, baseGrams: milkMethod?.grams ?? tea.baseGrams, steps: '' }
        : tea;
  const modes: { label: string; value: Mode }[] = [
    { label: '☕ Horúci', value: 'hot' },
    ...(milkSections.length ? [{ label: '🥛 S mliekom', value: 'milk' as const }] : []),
    ...(tea.coldBrew ? [{ label: '🧊 Cold brew', value: 'cold' as const }] : []),
  ];
  const volume = ml ?? recipe.baseMl;
  const grams = Math.max(1, Math.round((recipe.baseGrams * volume) / recipe.baseMl));
  const color = TYPE_COLORS[tea.type];
  const notes = tea.tasting.split(',').map((n) => n.trim()).filter(Boolean);
  const { country, region } = originParts(tea);
  const facts = (
    [
      ['Krajina', country],
      ['Región', region],
      ['Zber', tea.harvest],
      ['List', tea.leaf],
      ['Charakter', tea.character],
    ] as [string, string | undefined][]
  ).filter((f): f is [string, string] => !!f[1]);
  const steps = recipe.steps.split('\n').map((n) => n.trim()).filter(Boolean);
  const presets = Array.from(new Set([...(isCold ? COLD_PRESETS : PRESETS), recipe.baseMl])).sort((a, b) => a - b);
  const low = isLowStock(tea);

  const switchMode = (next: Mode) => {
    setMode(next);
    setMl(null);
  };

  const switchMilk = (i: number) => {
    setMilkIdx(i);
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

  const recordDrink = (coldBrew: boolean) => {
    const drunk = withDrink(tea, coldBrew, grams, volume);
    if (drunk) update(tea.id, { drunk });
  };

  // Do histórie sa zapisuje nová konvička: 1. nálev, alebo prvý časovač po dlhšej pauze.
  const runSteep = (i: number) => {
    const next = i + 1;
    setNextSteep(next);
    saveNextSteep(tea.id, next);
    if (isNewBrew(tea, i)) recordDrink(false);
    startSteepTimer(tea.steeps[i]);
  };

  const runColdTimer = (hours: number) => {
    recordDrink(true);
    startSteepTimer(Math.round(hours * 3600));
  };

  // Pri čaji s mliekom je len jeden časovač – čas z receptu, kým sa pridá mlieko.
  const milkTimer = milkMethod ? findMilkTimer(milkMethod.lines) : null;
  const runMilkTimer = () => {
    if (!milkTimer) return;
    recordDrink(false);
    startSteepTimer(milkTimer.sec);
  };

  const resetSteeps = () => {
    setNextSteep(0);
    saveNextSteep(tea.id, 0);
  };

  const log = (tea.log ?? []).filter((e) => e.note);

  const addNote = () => {
    if (!note.trim()) return;
    const entry: LogEntry = { id: newId(), at: new Date().toISOString(), note: note.trim() };
    update(tea.id, { log: [entry, ...log] });
    setNote('');
  };

  const removeLog = (entryId: string) =>
    confirmAction('Vymazať túto poznámku?', () => update(tea.id, { log: log.filter((e) => e.id !== entryId) }));

  const openShop = () => {
    if (!tea.shopUrl) return;
    const url = shopHref(tea.shopUrl);
    if (Platform.OS === 'web') window.open(url, '_blank', 'noopener');
    else Linking.openURL(url);
  };

  const duplicate = () => {
    const copy = {
      ...tea,
      id: newId(),
      name: `${tea.name} (kópia)`,
      favorite: false,
      stockGrams: undefined,
      log: undefined,
      drunk: undefined,
    };
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
        {!!tea.shopUrl && (
          <Pressable onPress={openShop} hitSlop={6} style={{ alignSelf: 'flex-start' }}>
            <Text style={s.shopLink}>🛒 Pozrieť v e-shope</Text>
          </Pressable>
        )}
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
        {lastDrunkLabel(tea) && (
          <Pressable onPress={() => router.push('/historia')} hitSlop={6} style={{ alignSelf: 'flex-start' }}>
            <Text style={s.lastDrunk}>
              🕘 Naposledy {lastDrunkLabel(tea)} · spolu {tea.drunk!.length}×
            </Text>
          </Pressable>
        )}
      </View>

      {!!tea.description && <Text style={s.body}>{tea.description}</Text>}

      {facts.length > 0 && (
        <Card style={{ gap: 0, paddingVertical: 6 }}>
          {facts.map(([label, value], i) => (
            <View key={label} style={[s.factRow, i > 0 && s.factBorder]}>
              <Text style={s.factLabel}>{label}</Text>
              <Text style={s.factValue}>{value}</Text>
            </View>
          ))}
        </Card>
      )}

      {notes.length > 0 && (
        <View>
          <SectionTitle>Čo hľadať</SectionTitle>
          <View style={s.wrap}>
            {notes.map((n) => (
              <Chip key={n} label={n} />
            ))}
          </View>
        </View>
      )}

      {modes.length > 1 && (
        <View style={s.segment}>
          {modes.map((o) => {
            const active = (isCold ? 'cold' : isMilk ? 'milk' : 'hot') === o.value;
            return (
              <Pressable
                key={o.value}
                onPress={() => switchMode(o.value)}
                style={[s.segmentBtn, active && { backgroundColor: color }]}>
                <Text style={[s.segmentText, active && { color: '#FFF' }]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Card style={{ gap: 14 }}>
        <SectionTitle>
          {isCold ? 'Koľko cold brew si chceš pripraviť?' : isMilk ? 'Koľko čaju s mliekom chceš?' : 'Koľko si chceš pripraviť?'}
        </SectionTitle>
        {isMilk && milkMethods.length > 1 && (
          <View style={s.wrap}>
            {milkMethods.map((m, i) => (
              <Chip key={m.title} label={m.title} active={m === milkMethod} color={color} onPress={() => switchMilk(i)} />
            ))}
          </View>
        )}
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
          ) : isMilk ? null : (
            <Param label="Teplota" value={`${tea.tempC} °C`} />
          )}
          <Param label="Pomer" value={`${formatGrams(recipe.baseGrams)} / ${recipe.baseMl} ml`} />
        </View>
      </Card>

      {isMilk && milkTimer && (
        <Card style={{ gap: 10 }}>
          <SectionTitle>Lúhovanie</SectionTitle>
          <View style={s.steepRow}>
            <Text style={s.body}>
              {milkTimer.label} · <Text style={{ fontWeight: '700' }}>{formatTime(milkTimer.sec)}</Text>
            </Text>
            <TimerButton color={color} onPress={runMilkTimer} />
          </View>
          <Text style={s.hint}>Keď zazvoní, pokračuj podľa postupu nižšie.</Text>
        </Card>
      )}

      {!isCold && !isMilk && tea.steeps.length > 0 && (
        <Card style={{ gap: 10 }}>
          <SectionTitle>Lúhovanie</SectionTitle>
          {tea.steeps.map((sec, i) => (
            <View
              key={i}
              style={[
                s.steepRow,
                i < nextSteep && { opacity: 0.45 },
                i === nextSteep && [s.steepNext, { borderColor: color }],
              ]}>
              <View style={{ gap: 1 }}>
                {i === nextSteep && <Text style={[s.nextLabel, { color }]}>Na rade</Text>}
                <Text style={s.body}>
                  {i < nextSteep ? '✓ ' : ''}
                  {i + 1}. nálev · <Text style={{ fontWeight: '700' }}>{formatTime(sec)}</Text>
                </Text>
              </View>
              <TimerButton color={color} onPress={() => runSteep(i)} />
            </View>
          ))}
          {nextSteep >= tea.steeps.length && (
            <Text style={[s.body, { color: C.olive, fontWeight: '600' }]}>Všetky nálevy sú hotové 🍵</Text>
          )}
          {nextSteep > 0 && (
            <Pressable onPress={resetSteeps} hitSlop={8}>
              <Text style={[s.hint, { color: C.accent, fontWeight: '700' }]}>↺ Začať odznova</Text>
            </Pressable>
          )}
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
              <TimerButton color={color} onPress={() => runColdTimer(tea.coldBrew!.hours)} />
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

      {isMilk && (
        <MilkSteps
          sections={milkMethod ? [milkMethod, ...milkSections.filter((m) => !milkMethods.includes(m as MilkMethod))] : milkSections}
          color={color}
          volume={volume}
        />
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
          {low && !!tea.shopUrl && <Button title="🛒 Objednať" onPress={openShop} />}
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

      <Card style={{ gap: 12 }}>
        <SectionTitle>📝 Denník</SectionTitle>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Tvoja poznámka, napr. trochu horký, nabudúce 90 °C"
          placeholderTextColor="#B9A693"
          multiline
          style={s.noteInput}
        />
        {!!note.trim() && <Button title="Pridať poznámku" variant="soft" onPress={addNote} />}
        {(showAllLog ? log : log.slice(0, 5)).map((e) => (
          <View key={e.id} style={s.logRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.logDate}>{formatDate(e.at)}</Text>
              <Text style={s.logNote}>{e.note}</Text>
            </View>
            <Pressable onPress={() => removeLog(e.id)} hitSlop={10} accessibilityLabel="Vymazať poznámku">
              <Text style={s.logDelete}>×</Text>
            </Pressable>
          </View>
        ))}
        {log.length > 5 && (
          <Pressable onPress={() => setShowAllLog(!showAllLog)} hitSlop={8}>
            <Text style={[s.hint, { color: C.accent, fontWeight: '700', textAlign: 'center' }]}>
              {showAllLog ? 'Zobraziť menej' : `Zobraziť všetky (${log.length})`}
            </Text>
          </Pressable>
        )}
      </Card>

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

// Riadok končiaci dvojbodkou je nadpis spôsobu prípravy, ostatné riadky sú číslované kroky.
// Prepočíta množstvá v {zátvorkách} podľa zvoleného objemu, napr. „{4 g}“, „{50 – 80 ml}“, „{2 – 3}“.
function scaleAmounts(line: string, factor: number) {
  return line.replace(/\{([^}]+)\}/g, (_, inner: string) => {
    const unit = /\bg\s*$/.test(inner) ? 'g' : /\bml\s*$/.test(inner) ? 'ml' : '';
    return inner.replace(/\d+(?:[.,]\d+)?/g, (num) => {
      const v = Number(num.replace(',', '.')) * factor;
      if (unit === 'ml') return String(Math.max(10, Math.round(v / 10) * 10));
      return String(Math.max(1, Math.round(v)));
    });
  });
}

type MilkSection = { title: string; ml?: number; grams?: number; lines: string[] };
type MilkMethod = MilkSection & { ml: number; grams: number };

// Riadok končiaci dvojbodkou je nadpis spôsobu; „· 350 ml“ v nadpise je objem, pre ktorý sú
// množstvá napísané. Prvé „{5 g}“ v krokoch je gramáž čaju pre tento spôsob, podľa nej sa
// odpočítava zásoba. Nadpis bez ml (napr. „Tipy:“) je len doplnok, ukáže sa pri každom spôsobe.
function parseMilk(text: string) {
  const sections: MilkSection[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.endsWith(':')) {
      const m = line.match(/^(.*?)\s*·\s*(\d+)\s*ml:$/);
      sections.push(m ? { title: m[1], ml: Number(m[2]), lines: [] } : { title: line.slice(0, -1), lines: [] });
      continue;
    }
    if (!sections.length) sections.push({ title: '', lines: [] });
    const sec = sections[sections.length - 1];
    sec.lines.push(line);
    const g = sec.grams === undefined && line.match(/\{(\d+(?:[.,]\d+)?)[^}]*?\bg\s*\}/);
    if (g) sec.grams = Number(g[1].replace(',', '.'));
  }
  return sections;
}

// Prvý čas v krokoch receptu, napr. „lúhuj 5 minút“ alebo „var 3 – 4 minúty“ (berie sa kratší).
function findMilkTimer(lines: string[]) {
  for (const line of lines) {
    const m = line.match(/(\d+)(?:\s*[–-]\s*\d+)?\s*min/);
    if (m) return { sec: Number(m[1]) * 60, label: /var/i.test(line) ? 'Varenie čaju' : 'Lúhovanie' };
  }
  return null;
}

function MilkSteps({ sections, color, volume }: { sections: MilkSection[]; color: string; volume: number }) {
  return (
    <Card style={{ gap: 12 }}>
      <SectionTitle>🥛 S mliekom</SectionTitle>
      {sections.map((sec, si) => {
        const factor = sec.ml ? volume / sec.ml : 1;
        return (
          <View key={si} style={{ gap: 12 }}>
            {!!sec.title && (
              <Text style={[s.milkHeading, si > 0 && { marginTop: 6 }]}>
                {sec.ml ? `${sec.title} · pre ${volume} ml` : sec.title}
              </Text>
            )}
            {sec.lines.map((line, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[s.stepNum, { borderColor: color }]}>
                  <Text style={[s.stepNumText, { color }]}>{i + 1}</Text>
                </View>
                <Text style={[s.body, { flex: 1 }]}>{scaleAmounts(line, factor)}</Text>
              </View>
            ))}
          </View>
        );
      })}
      <Text style={s.hint}>Množstvá sa prepočítavajú podľa toho, koľko ml si zvolíš vyššie.</Text>
    </Card>
  );
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
  milkHeading: { color: C.accent, fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  factRow: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  factBorder: { borderTopWidth: 1, borderTopColor: C.border },
  factLabel: { width: 98, color: C.textSoft, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, paddingTop: 2 },
  factValue: { flex: 1, color: C.text, fontSize: 16, lineHeight: 22 },
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
  lastDrunk: { color: C.textSoft, fontSize: 14, marginTop: 2 },
  shopLink: { color: C.accent, fontSize: 15, fontWeight: '600', marginTop: 2 },
  steepNext: { borderWidth: 1.5, borderRadius: 14, marginHorizontal: -10, paddingHorizontal: 10, paddingVertical: 8 },
  nextLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  noteInput: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 12,
    minHeight: 70,
    fontSize: 16,
    color: C.text,
    textAlignVertical: 'top',
  },
  logRow: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 },
  logDate: { color: C.textSoft, fontSize: 12, fontWeight: '600' },
  logNote: { color: C.text, fontSize: 15, lineHeight: 21 },
  logDelete: { color: C.textSoft, fontSize: 22, paddingHorizontal: 4 },
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
