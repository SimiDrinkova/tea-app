import { router } from 'expo-router';
import { Platform } from 'react-native';

// Na webe router po priamom otvorení podstránky (napr. po obnovení) nenaviguje,
// preto sa na zoznam vrátime novým načítaním. `canGoBack` musí byť zo stacku
// (navigation.canGoBack()), router.canGoBack() tu vracia true aj keď späť nejde.
export function goHome(canGoBack: boolean) {
  if (canGoBack) router.back();
  else if (Platform.OS === 'web') window.location.assign('/tea-app/');
  else router.replace('/');
}
