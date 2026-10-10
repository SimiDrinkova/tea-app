import AsyncStorage from '@react-native-async-storage/async-storage';

// Ktorý nálev je na rade. Pamätá sa, lebo pri spustení časovača
// iPhone prepne do Skratiek a appka sa môže po návrate načítať nanovo.
const KEY = 'caj-app/session';
const EXPIRES_MS = 6 * 3600 * 1000;

type Session = { teaId: string; next: number; at: number };

export async function loadNextSteep(teaId: string): Promise<number> {
  try {
    const s: Session | null = JSON.parse((await AsyncStorage.getItem(KEY)) ?? 'null');
    if (s && s.teaId === teaId && Date.now() - s.at < EXPIRES_MS) return s.next;
  } catch {}
  return 0;
}

export function saveNextSteep(teaId: string, next: number) {
  const s: Session = { teaId, next, at: Date.now() };
  return AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {});
}
