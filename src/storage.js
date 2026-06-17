import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "gym-data";

export async function loadData() {
  try { const v = await AsyncStorage.getItem(KEY); return v ? JSON.parse(v) : null; }
  catch (e) { return null; }
}
export async function saveData(d) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* ignore */ }
}
