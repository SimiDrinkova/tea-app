import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'caj-app/caffeineLimit';

// Odporúčané maximum kofeínu za deň (EFSA): dospelí 400 mg, tehotenstvo a dojčenie 200 mg.
export const LIMITS = [
  { mg: 400, label: 'Dospelí', hint: 'do 400 mg denne' },
  { mg: 200, label: 'Tehotenstvo / dojčenie', hint: 'do 200 mg denne' },
] as const;

export const DEFAULT_LIMIT = 400;

export async function loadLimit(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? Number(raw) : DEFAULT_LIMIT;
  } catch {
    return DEFAULT_LIMIT;
  }
}

export function saveLimit(mg: number) {
  return AsyncStorage.setItem(KEY, String(mg)).catch(() => {});
}
