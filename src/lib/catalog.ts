import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import type { Tea } from './teas';

// Moje čaje zverejnené spolu s appkou (public/moje-caje.json).
// - Nový čaj sa pridá len raz, takže čaj, ktorý si v telefóne zmažem, sa znova neobjaví.
// - Keď sa čaj v zozname neskôr opraví, zmena sa prenesie, ale len ak som ho v appke neupravovala
//   (formulár Upraviť nastaví `edited`; hodnotenie, zásoba, história ani poznámky sa nerátajú).
const URL = '/tea-app/moje-caje.json';
const SEEN_KEY = 'caj-app/catalogSeen';

type Seen = Record<string, string>; // id → JSON verzie zo zoznamu, ktorú appka naposledy videla (stačí, že id je známe)

const snapshot = (t: Tea) => JSON.stringify(t);

// Líši sa uložený čaj od verzie v zozname? Porovnáva len polia zo zoznamu,
// takže moje hodnotenie, zásoba, história a poznámky sa neberú do úvahy.
function differs(stored: Tea, entry: Tea) {
  return (Object.keys(entry) as (keyof Tea)[]).some((k) => JSON.stringify(stored[k]) !== JSON.stringify(entry[k]));
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
      } else if (stored && !stored.edited && differs(stored, entry)) {
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
