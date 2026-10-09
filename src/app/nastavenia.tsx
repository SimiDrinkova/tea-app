import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, SectionTitle } from '@/components/ui';
import { Tea, useTeas } from '@/lib/teas';
import { C, serif } from '@/lib/theme';
import { confirmAction, SHORTCUT_NAME, startSteepTimer } from '@/lib/timer';

export default function Settings() {
  const { teas, replaceAll } = useTeas();
  const [message, setMessage] = useState('');

  const exportBackup = () => {
    if (Platform.OS !== 'web') return;
    const blob = new Blob([JSON.stringify({ version: 1, teas }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `moj-caj-zaloha-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setMessage(`Záloha s ${teas.length} čajmi je stiahnutá.`);
  };

  const importBackup = () => {
    if (Platform.OS !== 'web') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        const imported: Tea[] = Array.isArray(data) ? data : data.teas;
        if (!Array.isArray(imported) || imported.some((t) => !t.id || !t.name)) throw new Error();
        confirmAction(`Nahradiť tvoje čaje (${teas.length}) zálohou s ${imported.length} čajmi?`, () => {
          replaceAll(imported);
          setMessage(`Obnovených ${imported.length} čajov.`);
        });
      } catch {
        setMessage('Tento súbor nie je platná záloha.');
      }
    };
    input.click();
  };

  return (
    <ScrollView contentContainerStyle={s.page}>
      <Card style={{ gap: 12 }}>
        <SectionTitle>⏱ Nastavenie časovača</SectionTitle>
        <Text style={s.body}>
          Časovač lúhovania používa appku <Text style={s.b}>Skratky</Text> v iPhone. Zazvoní aj pri zamknutom telefóne.
          Stačí ho raz nastaviť:
        </Text>
        {[
          <>Otvor appku <Text style={s.b}>Skratky</Text> a ťukni na <Text style={s.b}>+</Text>.</>,
          <>Hore premenuj skratku presne na <Text style={s.b}>{SHORTCUT_NAME}</Text>.</>,
          <>Pridaj akciu <Text style={s.b}>Spustiť časovač</Text> (Start Timer).</>,
          <>
            V akcii ťukni na trvanie, vyber premennú <Text style={s.b}>Vstup skratky</Text> (Shortcut Input) a jednotku
            nastav na <Text style={s.b}>sekundy</Text>.
          </>,
          <>Ulož skratku a vyskúšaj to tlačidlom dole.</>,
        ].map((step, i) => (
          <View key={i} style={s.stepRow}>
            <Text style={s.stepNum}>{i + 1}</Text>
            <Text style={[s.body, { flex: 1 }]}>{step}</Text>
          </View>
        ))}
        <Button title="Vyskúšať (10 sekúnd)" onPress={() => startSteepTimer(10)} />
        <Text style={s.hint}>
          Ak sa zobrazí chyba, že skratka neexistuje, skontroluj, či sa volá presne „{SHORTCUT_NAME}“ (aj s
          diakritikou).
        </Text>
      </Card>

      <Card style={{ gap: 12 }}>
        <SectionTitle>💾 Záloha</SectionTitle>
        <Text style={s.body}>
          Tvoje čaje sú uložené len v tomto telefóne. Ak vymažeš dáta Safari, stratia sa, preto si občas stiahni zálohu
          (napríklad do Súborov alebo na iCloud).
        </Text>
        <Button title="Stiahnuť zálohu" variant="soft" onPress={exportBackup} />
        <Button title="Obnoviť zo zálohy" variant="soft" onPress={importBackup} />
        {!!message && <Text style={[s.hint, { color: C.olive }]}>{message}</Text>}
      </Card>

      <Text style={s.footer}>Môj čaj 🍵</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { padding: 18, paddingBottom: 60, gap: 18, maxWidth: 640, width: '100%', alignSelf: 'center' },
  body: { color: C.text, fontSize: 16, lineHeight: 24 },
  b: { fontWeight: '700' },
  hint: { color: C.textSoft, fontSize: 13, lineHeight: 19 },
  stepRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.chip,
    color: C.accent,
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '700',
    overflow: 'hidden',
  },
  footer: { fontFamily: serif, color: C.textSoft, textAlign: 'center', fontSize: 15 },
});
