import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { syncCatalog } from './catalog';
import type { TeaType } from './theme';

export type Tea = {
  id: string;
  name: string;
  type: TeaType;
  origin: string; // krajina a región spolu (pre zoznam a vyhľadávanie)
  country?: string;
  region?: string;
  harvest?: string; // zber, napr. Second Flush
  leaf?: string; // list / trieda, napr. TGFOP1
  character?: string;
  description: string;
  tasting: string; // čo hľadať v chuti, oddelené čiarkou
  baseMl: number; // pre koľko ml je gramáž
  baseGrams: number;
  tempC: number;
  steeps: number[]; // časy lúhovania v sekundách
  steps: string; // postup prípravy, jeden krok na riadok
  milkSteps?: string; // príprava s mliekom; riadok končiaci „:“ je nadpis spôsobu
  coldBrew?: ColdBrew;
  favorite?: boolean;
  rating?: number; // 1–5 hviezdičiek
  stockGrams?: number; // koľko gramov mám doma; undefined = nesledujem
  lowStockGrams?: number; // upozorniť, keď klesne pod
  shopUrl?: string; // odkaz na čaj v e-shope
  log?: LogEntry[]; // denník poznámok, najnovšie prvé
  drunk?: Drink[]; // história pitia, najnovšie prvé
  edited?: boolean; // upravený cez formulár, takže ho zoznam mojich čajov neprepíše
};

export type Drink = {
  at: string; // ISO dátum a čas
  cold?: boolean;
  grams?: number;
  ml?: number;
};

const RECENT_MS = 10 * 60 * 1000;

const sameDay = (a: string, b: Date) => new Date(a).toDateString() === b.toDateString();

// Zapíše novú prípravu. Ak bol ten istý čaj zapísaný pred menej ako 10 min,
// berieme to ako tú istú konvičku (napr. omylom spustený časovač dvakrát).
export function withDrink(tea: Tea, cold: boolean, grams: number, ml: number): Drink[] | null {
  const drunk = tea.drunk ?? [];
  if (drunk[0] && Date.now() - Date.parse(drunk[0].at) < RECENT_MS) return null;
  const entry: Drink = {
    at: new Date().toISOString(),
    cold: cold || undefined,
    grams,
    ml,
  };
  return [entry, ...drunk];
}

// Nová konvička = 1. nálev, alebo akýkoľvek nálev po viac ako 3 hodinách od posledného zápisu.
export function isNewBrew(tea: Tea, steepIndex: number) {
  const last = tea.drunk?.[0];
  return steepIndex === 0 || !last || Date.now() - Date.parse(last.at) > 3 * 3600 * 1000;
}

export function dayLabel(iso: string) {
  const d = new Date(iso);
  if (sameDay(iso, new Date())) return 'Dnes';
  if (sameDay(iso, new Date(Date.now() - 86400000))) return 'Včera';
  const label = d.toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function lastDrunkLabel(tea: Tea) {
  const last = tea.drunk?.[0];
  if (!last) return null;
  const label = dayLabel(last.at);
  return label === 'Dnes' || label === 'Včera' ? label.toLowerCase() : label;
}

// Moje poznámky k čaju (denník), najnovšie prvé.
export type LogEntry = {
  id: string;
  at: string; // ISO dátum a čas
  note: string;
};

// Krajina a región; staršie čaje majú len spoločné pole „pôvod“ (napr. „India, Assam“).
export function originParts(t: Tea) {
  if (t.country || t.region) return { country: t.country ?? '', region: t.region ?? '' };
  const [country = '', ...rest] = t.origin.split(',').map((x) => x.trim());
  return { country, region: rest.join(', ') };
}

export const isLowStock = (t: Tea) =>
  t.stockGrams !== undefined && t.stockGrams <= (t.lowStockGrams ?? DEFAULT_LOW_STOCK);

export const DEFAULT_LOW_STOCK = 20;

export type ColdBrew = {
  baseMl: number;
  baseGrams: number;
  hours: number; // lúhovanie v chladničke
  steps: string;
};

const KEY = 'caj-app/teas/v1';

const SEED: Tea[] = [
  {
    id: 'ukazka-assam',
    name: 'Assam (ukážka)',
    type: 'Čierny',
    origin: 'India, Assam',
    description: 'Plný, sladovo-medový čierny čaj. Výborný ráno, znesie aj kvapku mlieka.',
    tasting: 'slad, med, kakao, sušené ovocie',
    baseMl: 250,
    baseGrams: 3,
    tempC: 95,
    steeps: [180, 240],
    steps: 'Nahrej konvičku horúcou vodou.\nNasyp čaj a zalej vodou s teplotou 95 °C.\nLúhuj 3 minúty a sceď.\nDruhý nálev lúhuj o minútu dlhšie.',
    coldBrew: {
      baseMl: 500,
      baseGrams: 6,
      hours: 10,
      steps: 'Nasyp čaj do fľaše.\nZalej studenou filtrovanou vodou.\nZatvor a daj do chladničky na 8 – 12 hodín.\nSceď a pi do 2 dní.',
    },
  },
  {
    id: 'ukazka-sencha',
    name: 'Sencha (ukážka)',
    type: 'Zelený',
    origin: 'Japonsko, Shizuoka',
    description: 'Svieži japonský zelený čaj s jemnou sladkosťou. Pozor na príliš horúcu vodu, zhorkne.',
    tasting: 'čerstvá tráva, morské riasy, umami',
    baseMl: 200,
    baseGrams: 4,
    tempC: 75,
    steeps: [60, 20, 45],
    steps: 'Prevar vodu a nechaj ju vychladnúť na 75 °C.\nZalej čaj a lúhuj 1 minútu.\nVylej úplne do poslednej kvapky.\nĎalšie nálevy sú kratšie.',
    coldBrew: {
      baseMl: 500,
      baseGrams: 5,
      hours: 6,
      steps: 'Nasyp čaj do fľaše.\nZalej studenou vodou.\nLúhuj v chladničke 5 – 6 hodín, dlhšie by zhorkol.\nSceď a pi čerstvý.',
    },
  },
];

// Ukážkové čaje uložené pred pridaním cold brew dostanú cold brew recept dodatočne.
function withSeedUpdates(teas: Tea[]): Tea[] {
  return teas.map((t) => {
    const seed = SEED.find((x) => x.id === t.id);
    return seed && !t.coldBrew ? { ...t, coldBrew: seed.coldBrew } : t;
  });
}

type Ctx = {
  teas: Tea[];
  loaded: boolean;
  save: (tea: Tea) => void;
  update: (id: string, patch: Partial<Tea>) => void;
  remove: (id: string) => void;
  replaceAll: (teas: Tea[]) => void;
};

const TeasContext = createContext<Ctx | null>(null);

export function TeasProvider({ children }: { children: ReactNode }) {
  const [teas, setTeas] = useState<Tea[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => (raw ? withSeedUpdates(JSON.parse(raw)) : SEED))
      .catch(() => SEED)
      .then(async (stored) => {
        setTeas(stored);
        setLoaded(true);
        const next = await syncCatalog(stored);
        if (next) {
          setTeas(next);
          AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
        }
      });
  }, []);

  const persist = (next: Tea[]) => {
    setTeas(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  };

  const value: Ctx = {
    teas,
    loaded,
    save: (tea) =>
      persist(teas.some((t) => t.id === tea.id) ? teas.map((t) => (t.id === tea.id ? tea : t)) : [tea, ...teas]),
    update: (id, patch) => persist(teas.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    remove: (id) => persist(teas.filter((t) => t.id !== id)),
    replaceAll: persist,
  };

  return <TeasContext.Provider value={value}>{children}</TeasContext.Provider>;
}

export function useTeas() {
  const ctx = useContext(TeasContext);
  if (!ctx) throw new Error('useTeas must be used inside TeasProvider');
  return ctx;
}

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (!m) return `${s} s`;
  return s ? `${m}:${String(s).padStart(2, '0')} min` : `${m} min`;
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const time = d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return `Dnes ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Včera ${time}`;
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
}

export function shopHref(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function formatHours(h: number) {
  return `${String(h).replace('.', ',')} h`;
}

export function formatGrams(g: number) {
  const r = Math.round(g * 10) / 10;
  return `${String(r).replace('.', ',')} g`;
}
