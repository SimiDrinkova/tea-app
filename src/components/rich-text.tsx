import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { C, serif } from '@/lib/theme';

// **tučné** vo vnútri riadku
function Inline({ text, style }: { text: string; style?: object }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={style}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <Text key={i} style={{ fontWeight: '700' }}>
            {p.slice(2, -2)}
          </Text>
        ) : (
          p
        ),
      )}
    </Text>
  );
}

type Block =
  | { kind: 'h'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'table'; rows: string[][] };

function parse(body: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    const last = blocks[blocks.length - 1];
    if (!line) continue;
    if (line.startsWith('## ')) blocks.push({ kind: 'h', text: line.slice(3) });
    else if (line.startsWith('- ')) {
      if (last?.kind === 'ul') last.items.push(line.slice(2));
      else blocks.push({ kind: 'ul', items: [line.slice(2)] });
    } else if (line.startsWith('|')) {
      const cells = line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      if (last?.kind === 'table') last.rows.push(cells);
      else blocks.push({ kind: 'table', rows: [cells] });
    } else blocks.push({ kind: 'p', text: line });
  }
  return blocks;
}

export function RichText({ body }: { body: string }) {
  return (
    <View style={{ gap: 14 }}>
      {parse(body).map((b, i) => {
        if (b.kind === 'h') return <Text key={i} style={[s.h, i > 0 && { marginTop: 8 }]}>{b.text}</Text>;
        if (b.kind === 'p') return <Inline key={i} text={b.text} style={s.p} />;
        if (b.kind === 'ul')
          return (
            <View key={i} style={{ gap: 8 }}>
              {b.items.map((item, j) => (
                <View key={j} style={{ flexDirection: 'row', gap: 10 }}>
                  <Text style={s.bullet}>•</Text>
                  <Inline text={item} style={[s.p, { flex: 1 }]} />
                </View>
              ))}
            </View>
          );
        return (
          <View key={i} style={s.table}>
            {b.rows.map((row, j) => (
              <View key={j} style={[s.tr, j > 0 && s.trBorder, j === 0 && s.thRow]}>
                {row.map((cell, k) => (
                  <Inline
                    key={k}
                    text={cell}
                    // pri dvoch stĺpcoch je prvý užší (pojem a vysvetlenie), pri viacerých majú rovnakú šírku
                    style={[s.td, k === 0 && s.tdFirst, k === 0 && row.length > 2 && { flex: 2 }, j === 0 && { fontWeight: '700' }]}
                  />
                ))}
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

export function Sources({ sources }: { sources: { label: string; url: string }[] }) {
  const open = (url: string) => (Platform.OS === 'web' ? window.open(url, '_blank', 'noopener') : Linking.openURL(url));
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.sourcesTitle}>Zdroje</Text>
      {sources.map((src) => (
        <Pressable key={src.url} onPress={() => open(src.url)} hitSlop={4}>
          <Text style={s.source}>{src.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  h: { fontFamily: serif, fontSize: 21, color: C.text },
  p: { color: C.text, fontSize: 16, lineHeight: 25 },
  bullet: { color: C.accent, fontSize: 16, lineHeight: 25 },
  table: { borderWidth: 1, borderColor: C.border, borderRadius: 14, overflow: 'hidden', backgroundColor: C.card },
  tr: { flexDirection: 'row' },
  thRow: { backgroundColor: C.chip },
  trBorder: { borderTopWidth: 1, borderTopColor: C.border },
  td: { flex: 2, flexBasis: 0, minWidth: 0, padding: 10, color: C.text, fontSize: 14, lineHeight: 20 },
  tdFirst: { flex: 1.25, fontWeight: '600' },
  sourcesTitle: { color: C.textSoft, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  source: { color: C.accent, fontSize: 14, lineHeight: 20, textDecorationLine: 'underline' },
});
