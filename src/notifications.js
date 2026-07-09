// Notificaciones locales para el temporizador de descanso.
// Require guardado: si el módulo nativo no está (Expo Go), degrada a no-op.
let Notifications = null;
try {
  Notifications = require('expo-notifications');
} catch {
  Notifications = null;
}

let configured = false;
let permissionAsked = false;

async function ensureReady() {
  if (!Notifications) return false;
  if (!configured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    configured = true;
  }
  if (!permissionAsked) {
    permissionAsked = true;
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') await Notifications.requestPermissionsAsync();
    } catch {}
  }
  return true;
}

// Programa una notificación dentro de `seconds`. Devuelve el id o null.
export async function scheduleRestDone(seconds, label) {
  const ok = await ensureReady();
  if (!ok || seconds <= 0) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: '¡Descanso terminado!',
        body: label && label !== 'Descanso' ? label : 'Toca la siguiente serie 💪',
        sound: true,
      },
      trigger: { seconds, channelId: 'rest-timer' },
    });
  } catch {
    return null;
  }
}

export async function cancelRest(id) {
  if (!Notifications || !id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {}
}

// Canal Android (necesario para sonido/heads-up). Llamar una vez al arrancar.
export async function initNotifChannel() {
  if (!Notifications) return;
  try {
    await Notifications.setNotificationChannelAsync('rest-timer', {
      name: 'Temporizador de descanso',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  } catch {}
}
