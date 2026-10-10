import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import type { Tea } from './teas';

// Moje čaje zverejnené spolu s appkou (public/moje-caje.json).
// - Nový čaj sa pridá len raz, takže čaj, ktorý si v telefóne zmažem, sa znova neobjaví.
// - Keď sa čaj v zozname neskôr opraví, zmena sa prenesie, ale len ak som ho v appke neupravovala.
const URL = '/tea-app/moje-caje.json';
const SEEN_KEY = 'caj-app/catalogSeen';

type Seen = Record<string, string>; // id → JSON verzie zo zoznamu, ktorú appka naposledy videla

const snapshot = (t: Tea) => JSON.stringify(t);

// Či má uložený čaj stále presne tie hodnoty, ktoré prišli zo zoznamu (teda som ho neupravovala).
function unchanged(stored: Tea, seenJson: string) {
  if (!seenJson) return true; // staršia verzia si obsah nepamätala, berieme ako neupravený
  try {
    const seen = JSON.parse(seenJson) as Record<string, unknown>;
    return Object.keys(seen).every(
      (k) => JSON.stringify((stored as Record<string, unknown>)[k]) === JSON.stringify(seen[k]),
    );
  } catch {
    return false;
  }
}

async function loadSeen(): Promise<Seen> {
  const raw = JSON.parse((await AsyncStorage.getItem(SEEN_KEY)) ?? '{}');
  // staršia verzia ukladala len zoznam id
  return Array.isArray(raw) ? Object.fromEntries(raw.map((id: string) => [id, ''])) : raw;
}

export async function syncCatalog(existing: Tea[]): Promise<Tea[] | null> {
  if (Platform.OS !== 'web') return null;
  try {
    const res = await fetch(URL, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const catalog: Tea[] = Array.isArray(data) ? data : data.teas;
    if (!Array.isArray(catalog)) return null;

    const seen = await loadSeen();
    let teas = existing;
    let changed = false;

    for (const entry of catalog) {
      if (!entry.id || !entry.name) continue;
      const json = snapshot(entry);
      const stored = teas.find((t) => t.id === entry.id);
      if (!(entry.id in seen)) {
        if (!stored) {
          teas = [entry, ...teas];
          changed = true;
        }
      } else if (seen[entry.id] !== json && stored && unchanged(stored, seen[entry.id])) {
        // opravený recept/popis; moje hodnotenie, zásoba, história a poznámky ostanú
        teas = teas.map((t) => (t.id === entry.id ? { ...t, ...entry } : t));
        changed = true;
      }
      seen[entry.id] = json;
    }

    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(seen));
    return changed ? teas : null;
  } catch {
    return null; // bez internetu nevadí, skúsi to nabudúce
  }
}
