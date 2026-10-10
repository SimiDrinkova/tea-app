import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

// Sprievodca svetom čierneho čaju; text je v public/sprievodca.json, aby sa dal opraviť bez novej verzie appky.
const URL = '/tea-app/sprievodca.json';
const CACHE_KEY = 'caj-app/guide';

export type Chapter = {
  id: string;
  title: string;
  summary: string;
  body: string; // „## “ podnadpis, „- “ odrážka, „| a | b |“ riadok tabuľky, **tučné**
  sources?: { label: string; url: string }[];
};

export function useGuide() {
  const [chapters, setChapters] = useState<Chapter[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => raw && alive && setChapters(JSON.parse(raw)))
      .catch(() => {});
    fetch(URL, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (!alive) return;
        setChapters(data.chapters);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data.chapters)).catch(() => {});
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);

  return { chapters, error };
}
