import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export async function writeAndShare(filename, content) {
  try {
    const uri = FileSystem.documentDirectory + filename;
    await FileSystem.writeAsStringAsync(uri, content);
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
    else Alert.alert('Guardado', `Archivo creado: ${filename}`);
  } catch {
    Alert.alert('Error', 'No se pudo exportar el archivo.');
  }
}
