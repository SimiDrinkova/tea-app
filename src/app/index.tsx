import { Link, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Chip } from '@/components/ui';
import { backupDueDays, exportBackup, snoozeBackup } from '@/lib/backup';
import { formatGrams, isLowStock, Tea, useTeas } from '@/lib/teas';
import { C, serif, TEA_TYPES, TYPE_COLORS, TeaType } from '@/lib/theme';

const SORTS = {
  favorite: { label: 'Obľúbené', cmp: (a: Tea, b: Tea) => Number(!!b.favorite) - Number(!!a.favorite) || (b.rating ?? 0) - (a.rating ?? 0) },
  rating: { label: 'Hodnotenie', cmp: (a: Tea, b: Tea) => (b.rating ?? 0) - (a.rating ?? 0) },
  name: { label: 'Názov', cmp: (a: Tea, b: Tea) => a.name.localeCompare(b.name, 'sk') },
};
type SortKey = keyof typeof SORTS;

export default function TeaList() {
  const { teas, loaded } = useTeas();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<TeaType | null>(null);
  const [sort, setSort] = useState<SortKey>('favorite');
  const [backupDue, setBackupDue] = useState<number | null>(null);

  useEffect(() => {
    backupDueDays().then(setBackupDue).catch(() => {});
  }, []);

  const backupNow = async () => {
    if (await exportBackup(teas)) setBackupDue(null);
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return teas
      .filter(
        (t) =>
          (!type || t.type === type) &&
          (!q || [t.name, t.origin, t.tasting, t.description].join(' ').toLowerCase().includes(q)),
      )
      .sort(SORTS[sort].cmp);
  }, [teas, query, type, sort]);
  const lowCount = teas.filter(isLowStock).length;

  const usedTypes = TEA_TYPES.filter((ty) => teas.some((t) => t.type === ty));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[s.page, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 110 }]}>
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.kicker}>Moja čajovňa</Text>
            <Text style={s.title}>Môj čaj</Text>
          </View>
          <Link href="/historia" asChild>
            {/* Link asChild na webe neznesie pole štýlov, preto jeden objekt. */}
            <Pressable style={s.iconBtnSpaced} accessibilityLabel="História">
              <Text style={{ fontSize: 19 }}>🕘</Text>
            </Pressable>
          </Link>
          <Link href="/nastavenia" asChild>
            <Pressable style={s.iconBtn} accessibilityLabel="Nastavenia">
              <Text style={{ fontSize: 20 }}>⚙︎</Text>
            </Pressable>
          </Link>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Hľadať čaj, chuť, pôvod…"
          placeholderTextColor="#B9A693"
          style={s.search}
        />

        {usedTypes.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Chip label="Všetky" active={!type} onPress={() => setType(null)} />
            {usedTypes.map((ty) => (
              <Chip key={ty} label={ty} color={TYPE_COLORS[ty]} active={type === ty} onPress={() => setType(ty)} />
            ))}
          </ScrollView>
        )}

        {teas.length > 1 && (
          <View style={s.sortRow}>
            <Text style={s.sortLabel}>Zoradiť:</Text>
            {(Object.keys(SORTS) as SortKey[]).map((k) => (
              <Pressable key={k} onPress={() => setSort(k)} hitSlop={6}>
                <Text style={[s.sortOption, sort === k && s.sortActive]}>{SORTS[k].label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {backupDue !== null && teas.length > 0 && (
          <View style={s.backupBanner}>
            <Text style={s.backupText}>
              💾 Zálohu si nerobila {backupDue} dní. Tvoje čaje sú len v tomto telefóne.
            </Text>
            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
              <Pressable onPress={backupNow} hitSlop={6}>
                <Text style={s.backupAction}>Zálohovať</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  snoozeBackup();
                  setBackupDue(null);
                }}
                hitSlop={6}>
                <Text style={s.backupLater}>Neskôr</Text>
              </Pressable>
            </View>
          </View>
        )}

        {lowCount > 0 && (
          <Text style={s.lowBanner}>
            ⚠︎ {lowCount === 1 ? '1 čaj ti dochádza' : `${lowCount} čaje ti dochádzajú`}
          </Text>
        )}

        {loaded && teas.length === 0 && (
          <Card style={{ alignItems: 'center', paddingVertical: 36 }}>
            <Text style={{ fontSize: 42 }}>🍵</Text>
            <Text style={s.emptyTitle}>Zatiaľ tu nie je žiadny čaj</Text>
            <Text style={s.soft}>Pridaj svoj prvý čaj tlačidlom dole.</Text>
          </Card>
        )}

        {shown.map((t) => (
          <Link key={t.id} href={{ pathname: '/caj/[id]', params: { id: t.id } }} asChild>
            <Pressable style={({ pressed }) => pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }}>
              <Card style={s.teaCard}>
                <View style={[s.swatch, { backgroundColor: TYPE_COLORS[t.type] }]}>
                  <Text style={s.swatchText}>{t.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={s.teaName} numberOfLines={1}>
                    {t.favorite ? <Text style={{ color: C.danger }}>♥ </Text> : null}
                    {t.name}
                  </Text>
                  <Text style={s.soft} numberOfLines={1}>
                    {[t.type, t.origin].filter(Boolean).join(' · ')}
                  </Text>
                  {!!t.tasting && (
                    <Text style={s.tasting} numberOfLines={1}>
                      {t.tasting}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={s.meta}>{t.tempC} °C</Text>
                  {t.rating ? <Text style={s.rating}>{'★'.repeat(t.rating)}</Text> : null}
                  {isLowStock(t) ? (
                    <Text style={s.lowBadge}>{t.stockGrams === 0 ? 'Došiel' : `Zostáva ${formatGrams(t.stockGrams!)}`}</Text>
                  ) : (
                    <Text style={s.metaSoft}>
                      {formatGrams(t.baseGrams)} / {t.baseMl} ml
                    </Text>
                  )}
                </View>
              </Card>
            </Pressable>
          </Link>
        ))}

        {loaded && teas.length > 0 && shown.length === 0 && (
          <Text style={[s.soft, { textAlign: 'center', marginTop: 20 }]}>Nič sa nenašlo.</Text>
        )}
      </ScrollView>

      <Pressable
        onPress={() => router.push('/upravit')}
        style={({ pressed }) => [s.fab, { bottom: insets.bottom + 24 }, pressed && { transform: [{ scale: 0.96 }] }]}>
        <Text style={s.fabText}>＋ Pridať čaj</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  page: { paddingHorizontal: 18, gap: 14, maxWidth: 640, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4 },
  kicker: { color: C.olive, fontSize: 13, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { fontFamily: serif, fontSize: 38, color: C.text },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnSpaced: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.chip,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  search: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    color: C.text,
  },
  teaCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  swatch: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  swatchText: { color: '#FFF', fontFamily: serif, fontSize: 24 },
  teaName: { fontFamily: serif, fontSize: 19, color: C.text },
  soft: { color: C.textSoft, fontSize: 14 },
  tasting: { color: C.olive, fontSize: 13, fontStyle: 'italic' },
  meta: { color: C.text, fontWeight: '600', fontSize: 15 },
  metaSoft: { color: C.textSoft, fontSize: 12 },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  sortLabel: { color: C.textSoft, fontSize: 14 },
  sortOption: { color: C.textSoft, fontSize: 14, paddingVertical: 2 },
  sortActive: { color: C.accent, fontWeight: '700', textDecorationLine: 'underline' },
  rating: { color: '#D49A2A', fontSize: 12, letterSpacing: 1 },
  lowBanner: {
    backgroundColor: '#FBF0EC',
    color: C.danger,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '600',
    overflow: 'hidden',
  },
  backupBanner: {
    backgroundColor: '#EAF0F2',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#D5E0E4',
  },
  backupText: { color: C.text, fontSize: 14, lineHeight: 20 },
  backupAction: { color: C.accent, fontWeight: '700', fontSize: 15 },
  backupLater: { color: C.textSoft, fontSize: 15 },
  lowBadge: { color: C.danger, fontSize: 12, fontWeight: '700' },
  emptyTitle: { fontFamily: serif, fontSize: 20, color: C.text, marginTop: 10, marginBottom: 4 },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: C.accent,
    paddingHorizontal: 26,
    paddingVertical: 16,
    borderRadius: 999,
    boxShadow: '0 8px 22px rgba(90, 60, 30, 0.3)',
  },
  fabText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
