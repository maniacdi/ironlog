# IronLog 🏋️

App de seguimiento de entrenamiento hecha con **Expo / React Native**: rutinas con biblioteca de ejercicios, registro de series con cronómetro de descanso, sensaciones, duración por entreno, panel de progreso (frecuencia, fuerza, volumen por músculo) e importación/exportación CSV y JSON.

Los datos se guardan en el dispositivo (AsyncStorage). La app arranca con datos de ejemplo; puedes restablecer desde **Datos → Restablecer todo**. Tu rutina viene incluida en `mi-rutina.json` (impórtala desde **Datos → Subir CSV/JSON**).

---

## Requisitos previos (una sola vez)

1. **Node.js LTS** (18 o superior). Compruébalo con `node -v`. Si no lo tienes: https://nodejs.org
2. En tu **móvil**, instala la app **Expo Go**:
   - Android: Google Play → "Expo Go"
   - iOS: App Store → "Expo Go"

No necesitas Android Studio ni Xcode para probarla en tu teléfono con Expo Go.

---

## Puesta en marcha (común a Android e iOS)

Desde una terminal, en la carpeta del proyecto:

```bash
cd ironlog
npm install
# Alinea los módulos nativos con tu versión de Expo (recomendado):
npx expo install react-native-svg @react-native-async-storage/async-storage expo-document-picker expo-file-system expo-sharing expo-status-bar
npx expo start
```

Se abrirá una página con un **código QR** en la terminal/navegador.

---

## 📱 ANDROID (primero)

1. Asegúrate de que el **móvil y el ordenador están en la misma red WiFi**.
2. Con el servidor arrancado (`npx expo start`), abre **Expo Go** en el Android.
3. Pulsa **"Scan QR code"** dentro de Expo Go y escanea el QR de la terminal.
4. La app se descargará y abrirá en tu teléfono. Cada vez que guardes un cambio en el código, se recarga sola.

> Si el QR no conecta (redes con aislamiento de clientes, VPN, etc.), arranca en modo túnel:
> ```bash
> npx expo start --tunnel
> ```
> (la primera vez puede pedir instalar `@expo/ngrok`; acepta).

### Generar un APK instalable (opcional, sin ordenador del usuario final)
Para tener un `.apk` que instalar directamente:
```bash
npm install -g eas-cli
eas login              # crea una cuenta gratuita en expo.dev si no la tienes
eas build:configure
eas build -p android --profile preview
```
Al terminar, EAS te da un enlace para descargar el APK e instalarlo en cualquier Android (activa "instalar apps de orígenes desconocidos").

---

## 🍎 iOS (después)

### Opción A — Probar con Expo Go (lo más rápido)
1. Móvil y ordenador en la **misma WiFi**.
2. Con `npx expo start` arrancado, abre la **app Cámara** del iPhone y apunta al **QR**.
3. Toca la notificación que aparece para abrirlo en **Expo Go**.

### Opción B — Build para instalar / TestFlight
Para llevarla al iPhone como app independiente necesitas una **cuenta de Apple Developer** (de pago, 99 $/año) y normalmente un Mac o EAS Build:
```bash
eas build -p ios --profile preview
```
- Sin cuenta de desarrollador puedes instalarla en **tu propio** iPhone con un Mac + Xcode (firma personal, caduca a los 7 días).
- Con cuenta de desarrollador, súbela a **TestFlight** para instalarla de forma estable:
  ```bash
  eas submit -p ios
  ```

> En resumen: en iOS, **Expo Go** vale para usarla y probarla ya; un build independiente requiere cuenta de Apple.

---

## Estructura del proyecto

```
ironlog/
  App.js                 # raíz: carga/guardado, pestañas, entreno en curso, descanso
  index.js               # punto de entrada
  app.json               # configuración de Expo
  mi-rutina.json         # tu rutina, lista para importar
  modules/exact-alarm/   # módulo nativo local: permiso de alarmas exactas (Android 12+)
  src/
    theme.js             # colores y estilos
    helpers.js           # utilidades, fechas, CSV, exportación para IA
    storage.js           # AsyncStorage por bloques (historial por año) + entreno en curso
    dataModel.js         # seed + migración de esquema
    domain/              # lógica pura y testeada: tipos de ejercicio, series/volumen,
                         #   sesión, estadísticas, unidades, validación, import/export
    hooks/               # temporizador de descanso, persistencia, permisos
    components/          # Icon, Stepper, Charts, ExercisePicker, BottomSheet…
    screens/             # today/ (sesión, detalle…), Routines, Exercises, Progress, Data
    __tests__/           # tests de Jest
```

## Tipos de ejercicio

| Tipo | Serie registra | Progreso |
|------|----------------|----------|
| Fuerza | reps + peso | peso máx. y 1RM estimado |
| Peso corporal | reps + lastre | reps máx. y lastre |
| Tiempo | segundos | segundos máx. |
| Cardio | minutos + km/h + inclinación | minutos y distancia estimada |

En el CSV/JSON de rutinas, la columna `tipo` acepta `fuerza`, `peso corporal`, `tiempo` o `cardio` (si falta se deduce del nombre/músculo). Para tiempo y cardio, `reps` es el objetivo en segundos o minutos.

Durante el entreno puedes **cambiar** un ejercicio por otro (p. ej. barra ocupada → mancuernas): el sustituto usa su propio historial. El interruptor **peso total / por mancuerna** hace que el volumen cuente ×2.

## Desarrollo

```bash
npm test        # tests (Jest)
npm run lint    # ESLint
```

## Notas
- El entreno en curso se guarda continuamente: si Android cierra la app durante un descanso, al volver sigue donde estaba.
- Si los datos guardados no se pueden leer, la app **no** sobrescribe nada: muestra una pantalla para reintentar o exportar una copia de rescate (restaurable desde Datos).
- El aviso de fin de descanso necesita el permiso «Alarmas y recordatorios» en Android 12+ (Datos → Notificaciones de descanso). Requiere build nativo (`npm run build:prod`), no llega por OTA.
- Si cambias de versión de Expo, vuelve a ejecutar `npx expo install <paquetes>` para que las versiones nativas cuadren.
- Las gráficas usan `react-native-svg` (sin dependencias pesadas).
- Para fuentes tipo "Oswald" puedes añadir `expo-font` más adelante; ahora se usa la tipografía del sistema.
