import { Alert, Platform } from 'react-native';

// react-native-web's Alert.alert() is a no-op, so confirmations need a web-specific path.
export function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Confirmer', onPress: onConfirm },
  ]);
}
