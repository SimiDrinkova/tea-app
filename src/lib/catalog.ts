import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import type { Tea } from './teas';

// Moje čaje zverejnené spolu s appkou (public/moje-caje.json). Každý sa pridá len raz,
// takže čaj, ktorý si v telefóne zmažem, sa znova neobjaví.
const URL = '/tea-app/moje-caje.json';
const SEEN_KEY = 'caj-app/catalogSeen';

export async function newCatalogTeas(existing: Tea[]): Promise<Tea[]> {
  if (Platform.OS !== 'web') return [];
  try {
    const res = await fetch(URL, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    const catalog: Tea[] = Array.isArray(data) ? data : data.teas;
    if (!Array.isArray(catalog)) return [];
    const seen = new Set<string>(JSON.parse((await AsyncStorage.getItem(SEEN_KEY)) ?? '[]'));
    const have = new Set(existing.map((t) => t.id));
    const fresh = catalog.filter((t) => t.id && t.name && !seen.has(t.id) && !have.has(t.id));
    catalog.forEach((t) => seen.add(t.id));
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
    return fresh;
  } catch {
    return []; // bez internetu nevadí, skúsi to nabudúce
  }
}
