import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import type { TeaType } from './theme';

export type Tea = {
  id: string;
  name: string;
  type: TeaType;
  origin: string;
  description: string;
  tasting: string; // čo v čaji cítiť, oddelené čiarkou
  baseMl: number; // pre koľko ml je gramáž
  baseGrams: number;
  tempC: number;
  steeps: number[]; // časy lúhovania v sekundách
  steps: string; // postup prípravy, jeden krok na riadok
  coldBrew?: ColdBrew;
  favorite?: boolean;
  rating?: number; // 1–5 hviezdičiek
  stockGrams?: number; // koľko gramov mám doma; undefined = nesledujem
  lowStockGrams?: number; // upozorniť, keď klesne pod
};

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
      .then((raw) => setTeas(raw ? withSeedUpdates(JSON.parse(raw)) : SEED))
      .catch(() => setTeas(SEED))
      .finally(() => setLoaded(true));
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

export function formatHours(h: number) {
  return `${String(h).replace('.', ',')} h`;
}

export function formatGrams(g: number) {
  const r = Math.round(g * 10) / 10;
  return `${String(r).replace('.', ',')} g`;
}
