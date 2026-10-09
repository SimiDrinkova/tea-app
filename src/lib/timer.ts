import { Alert, Linking, Platform } from 'react-native';

export const SHORTCUT_NAME = 'Čajový časovač';

// Spustí iOS Skratku, ktorá nastaví systémový časovač (zvoní aj pri zamknutom telefóne).
export function startSteepTimer(seconds: number) {
  const url =
    'shortcuts://run-shortcut?name=' +
    encodeURIComponent(SHORTCUT_NAME) +
    '&input=text&text=' +
    seconds;
  if (Platform.OS === 'web') {
    window.location.href = url;
  } else {
    Linking.openURL(url);
  }
}

export function confirmAction(message: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onYes();
    return;
  }
  Alert.alert(message, undefined, [
    { text: 'Zrušiť', style: 'cancel' },
    { text: 'Áno', style: 'destructive', onPress: onYes },
  ]);
}
