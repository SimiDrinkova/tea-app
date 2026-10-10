import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import type { Tea } from './teas';

const LAST_BACKUP_KEY = 'caj-app/lastBackup';
const FIRST_SEEN_KEY = 'caj-app/firstSeen';
const SNOOZE_KEY = 'caj-app/backupSnoozed';

export const BACKUP_EVERY_DAYS = 30;
const DAY = 86400000;

// Na iPhone otvorí ponuku Zdieľať (Uložiť do Súborov, iCloud…), inde stiahne súbor.
export async function exportBackup(teas: Tea[]): Promise<boolean> {
  if (Platform.OS !== 'web') return false;
  const name = `moj-caj-zaloha-${new Date().toISOString().slice(0, 10)}.json`;
  const json = JSON.stringify({ version: 1, teas }, null, 2);
  const file = new File([json], name, { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Záloha – Môj čaj' });
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(file);
      a.download = name;
      a.click();
    }
  } catch {
    return false; // zrušené v ponuke Zdieľať
  }
  await AsyncStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
  return true;
}

// Koľko dní od poslednej zálohy, ak je čas pripomenúť; inak null.
export async function backupDueDays(): Promise<number | null> {
  const [last, firstSeen, snoozed] = await Promise.all([
    AsyncStorage.getItem(LAST_BACKUP_KEY),
    AsyncStorage.getItem(FIRST_SEEN_KEY),
    AsyncStorage.getItem(SNOOZE_KEY),
  ]);
  const now = Date.now();
  if (!firstSeen) {
    await AsyncStorage.setItem(FIRST_SEEN_KEY, new Date(now).toISOString());
    return null;
  }
  if (snoozed && now - Date.parse(snoozed) < 7 * DAY) return null;
  const since = Date.parse(last ?? firstSeen);
  const days = Math.floor((now - since) / DAY);
  return days >= BACKUP_EVERY_DAYS ? days : null;
}

export function snoozeBackup() {
  return AsyncStorage.setItem(SNOOZE_KEY, new Date().toISOString());
}

export async function lastBackupDate(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_BACKUP_KEY);
}
