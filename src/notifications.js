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

function configure() {
  if (!Notifications || configured) return;
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

// Pide el permiso de notificaciones una sola vez. Se llama al empezar un
// entreno para que el diálogo no retrase la programación del primer descanso.
export async function ensureNotifPermission() {
  if (!Notifications || permissionAsked) return;
  permissionAsked = true;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') await Notifications.requestPermissionsAsync();
  } catch {}
}

// Programa una notificación dentro de `seconds`. Devuelve el id o null.
// La puntualidad en Android 12+ depende del permiso de alarmas exactas
// (ver src/exactAlarm.js).
export async function scheduleRestDone(seconds, label) {
  if (!Notifications || seconds <= 0) return null;
  configure();
  try {
    // El trigger DEBE llevar type TIME_INTERVAL; sin él, dispara al instante.
    const intervalType =
      Notifications.SchedulableTriggerInputTypes?.TIME_INTERVAL || 'timeInterval';
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: '¡Descanso terminado!',
        body: label && label !== 'Descanso' ? label : 'Toca la siguiente serie 💪',
        sound: true,
      },
      trigger: {
        type: intervalType,
        seconds: Math.max(1, Math.round(seconds)),
        channelId: 'rest-timer',
      },
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
  configure();
  try {
    await Notifications.setNotificationChannelAsync('rest-timer', {
      name: 'Temporizador de descanso',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  } catch {}
}
