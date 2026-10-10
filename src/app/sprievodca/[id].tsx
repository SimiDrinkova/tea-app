import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RichText, Sources } from '@/components/rich-text';
import { useGuide } from '@/lib/guide';
import { C, serif } from '@/lib/theme';

export default function GuideChapter() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { chapters } = useGuide();
  if (!chapters) return null;
  const index = chapters.findIndex((c) => c.id === id);
  const ch = chapters[index];
  if (!ch) return <Text style={{ padding: 24, color: C.text }}>Kapitola sa nenašla.</Text>;
  const next = chapters[index + 1];

  return (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={s.kicker}>Kapitola {index + 1}</Text>
      <Text style={s.title}>{ch.title}</Text>
      <RichText body={ch.body} />
      {!!ch.sources?.length && (
        <View style={s.sources}>
          <Sources sources={ch.sources} />
        </View>
      )}
      {next && (
        <Pressable
          onPress={() => router.replace({ pathname: '/sprievodca/[id]', params: { id: next.id } })}
          style={({ pressed }) => [s.next, pressed && { opacity: 0.85 }]}>
          <Text style={s.nextSmall}>Ďalšia kapitola</Text>
          <Text style={s.nextTitle}>{next.title} ›</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { padding: 20, paddingBottom: 60, gap: 12, maxWidth: 640, width: '100%', alignSelf: 'center' },
  kicker: { color: C.olive, fontSize: 13, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { fontFamily: serif, fontSize: 30, color: C.text, marginBottom: 8 },
  sources: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 16, marginTop: 12 },
  next: { marginTop: 18, backgroundColor: C.chip, borderRadius: 18, padding: 16, gap: 2 },
  nextSmall: { color: C.textSoft, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  nextTitle: { fontFamily: serif, fontSize: 18, color: C.accent },
});
