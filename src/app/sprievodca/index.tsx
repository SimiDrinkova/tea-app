import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { useGuide } from '@/lib/guide';
import { C, serif } from '@/lib/theme';

export default function GuideIndex() {
  const { chapters, error } = useGuide();

  return (
    <ScrollView contentContainerStyle={s.page}>
      <View style={{ gap: 6 }}>
        <Text style={s.kicker}>Sprievodca</Text>
        <Text style={s.title}>Svet čierneho čaju</Text>
        <Text style={s.lead}>
          Všetko, čo potrebuješ vedieť, keď s čajom začínaš: ako vzniká, čo znamenajú skratky na obale, odkiaľ pochádza
          a ako ho pripraviť.
        </Text>
      </View>

      {!chapters && !error && <Text style={s.soft}>Načítavam…</Text>}
      {!chapters && error && <Text style={s.soft}>Sprievodcu sa nepodarilo načítať. Skús to znova s internetom.</Text>}

      {chapters?.map((ch, i) => (
        <Link key={ch.id} href={{ pathname: '/sprievodca/[id]', params: { id: ch.id } }} asChild>
          <Pressable style={({ pressed }) => pressed && { opacity: 0.85 }}>
            <Card style={s.row}>
              <Text style={s.num}>{i + 1}</Text>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={s.chTitle}>{ch.title}</Text>
                <Text style={s.soft} numberOfLines={2}>
                  {ch.summary}
                </Text>
              </View>
            </Card>
          </Pressable>
        </Link>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { padding: 18, paddingBottom: 60, gap: 14, maxWidth: 640, width: '100%', alignSelf: 'center' },
  kicker: { color: C.olive, fontSize: 13, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { fontFamily: serif, fontSize: 32, color: C.text },
  lead: { color: C.textSoft, fontSize: 16, lineHeight: 24, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  num: { fontFamily: serif, fontSize: 26, color: C.accent, width: 30, textAlign: 'center' },
  chTitle: { fontFamily: serif, fontSize: 18, color: C.text },
  soft: { color: C.textSoft, fontSize: 14, lineHeight: 20 },
});
