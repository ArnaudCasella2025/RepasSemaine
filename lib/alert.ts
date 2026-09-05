import { Alert, Platform } from 'react-native';

// react-native-web's Alert.alert() is a no-op, so a web-specific path is needed.
export function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
