import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, Pressable, StatusBar, ActivityIndicator, BackHandler } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Anton_400Regular } from '@expo-google-fonts/anton';
import { IBMPlexMono_500Medium, IBMPlexMono_700Bold } from '@expo-google-fonts/ibm-plex-mono';
import { Icon } from './src/components/Icon';
import { ConfirmModal } from './src/components/ConfirmModal';
import { RestBar } from './src/components/RestBar';
import { C, S } from './src/theme';
import { loadData, saveData, loadActive, saveActive } from './src/storage';
import { migrate, seed } from './src/dataModel';
import { convertDataUnits, convertSessionUnits } from './src/domain/units';
import { initNotifChannel } from './src/notifications';
import { useRestTimer } from './src/hooks/useRestTimer';
import { usePersist } from './src/hooks/usePersist';
import TodayScreen from './src/screens/today/TodayScreen';
import RoutinesScreen from './src/screens/RoutinesScreen';
import ExercisesScreen from './src/screens/ExercisesScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import DataScreen from './src/screens/DataScreen';
import LoadErrorScreen from './src/screens/LoadErrorScreen';

const TABS = [
  ['today', 'calendar', 'Hoy'],
  ['routines', 'list', 'Rutinas'],
  ['exercises', 'book-open', 'Ejercicios'],
  ['progress', 'trending-up', 'Progreso'],
  ['data', 'database', 'Datos'],
];
const TITLES = {
  today: ['Hoy', 'Tu entrenamiento'],
  routines: ['Rutinas', 'Planifica'],
  exercises: ['Ejercicios', 'Biblioteca'],
  progress: ['Progreso', '¿Vas mejorando?'],
  data: ['Datos', 'Importar y ajustes'],
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AppInner />
    </SafeAreaProvider>
  );
}

function AppInner() {
  const [boot, setBoot] = useState({ status: 'loading' });
  const [data, setData] = useState(null);
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState('today');
  const [confirmExit, setConfirmExit] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const timer = useRestTimer();
  const insets = useSafeAreaInsets();
  const [fontsLoaded, fontError] = useFonts({
    Anton_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_700Bold,
  });
  const fontsReady = fontsLoaded || !!fontError; // si fallan, seguimos con fuente del sistema
  const { restore: restoreRest } = timer;

  const load = useCallback(async () => {
    setBoot({ status: 'loading' });
    const res = await loadData();
    if (res.status === 'error') return setBoot({ status: 'error', error: res.error });
    let d;
    try {
      d = res.status === 'empty' ? seed() : migrate(res.data);
    } catch (error) {
      return setBoot({ status: 'error', error });
    }
    // Entreno en curso que sobrevivió a un cierre de la app.
    const active = await loadActive();
    if (active?.session) setSession(active.session);
    restoreRest(active?.rest || null);
    setData(d);
    setBoot({ status: 'ok' });
  }, [restoreRest]);

  useEffect(() => {
    load();
    initNotifChannel();
  }, [load]);

  const ready = boot.status === 'ok' && !!data;

  // Solo se guarda con una carga correcta: nunca tras un error de lectura.
  usePersist(
    data,
    async (d) => {
      await saveData(d);
      setSaveError(null);
    },
    { enabled: ready, onError: (e) => setSaveError(String(e?.message || e)) },
  );

  const active = useMemo(() => ({ session, rest: timer.rest }), [session, timer.rest]);
  usePersist(active, saveActive, { enabled: ready, delay: 250 });

  // Botón atrás de Android. Con un entreno en curso NUNCA sale directamente:
  // pide confirmación. Los Modal de las pantallas se cierran solos antes de
  // llegar aquí (tienen su propio onRequestClose).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (confirmExit) {
        setConfirmExit(false);
        return true;
      }
      if (session) {
        setConfirmExit(true);
        return true;
      }
      if (tab !== 'today') {
        setTab('today');
        return true;
      }
      return false; // sin sesión y en Hoy → comportamiento normal (salir)
    });
    return () => sub.remove();
  }, [session, tab, confirmExit]);

  if (boot.status === 'error')
    return (
      <>
        <StatusBar barStyle='light-content' />
        <LoadErrorScreen error={boot.error} onRetry={load} insets={insets} />
      </>
    );

  if (!ready || !fontsReady)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: C.bg,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: insets.top,
        }}
      >
        <StatusBar barStyle='light-content' />
        <ActivityIndicator color={C.accent} size='large' />
      </View>
    );

  const unit = data.settings.unit;
  const startRest = (secs, label) => timer.start(secs || data.settings.restSeconds || 90, label);
  const discardSession = () => {
    setSession(null);
    timer.stop();
  };
  const changeUnit = (to) => {
    const from = data.settings.unit;
    setData((d) => convertDataUnits(d, to));
    setSession((s) => convertSessionUnits(s, from, to));
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle='light-content' backgroundColor={C.surface} />
      <View
        style={{
          paddingHorizontal: 18,
          paddingTop: 12 + insets.top,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderColor: C.line,
          backgroundColor: C.surface,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={S.title}>{TITLES[tab][0]}</Text>
          <Text style={[S.sub, { marginTop: 3 }]}>
            {session && tab === 'today' ? 'Entrenamiento en curso' : TITLES[tab][1]}
          </Text>
        </View>
        <Icon name='dumbbell' size={26} color={C.accent} />
      </View>

      {!!saveError && (
        <View style={{ backgroundColor: C.negative, paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
            No se pudieron guardar los últimos cambios. Exporta una copia desde Datos.
          </Text>
        </View>
      )}

      <View style={{ flex: 1 }}>
        {tab === 'today' && (
          <TodayScreen
            data={data}
            setData={setData}
            session={session}
            setSession={setSession}
            unit={unit}
            startRest={startRest}
            stopRest={timer.stop}
          />
        )}
        {tab === 'routines' && <RoutinesScreen data={data} setData={setData} unit={unit} />}
        {tab === 'exercises' && <ExercisesScreen data={data} setData={setData} session={session} />}
        {tab === 'progress' && <ProgressScreen data={data} unit={unit} />}
        {tab === 'data' && (
          <DataScreen
            data={data}
            setData={setData}
            onChangeUnit={changeUnit}
            hasSession={!!session}
          />
        )}
      </View>

      {timer.remaining > 0 && (
        <RestBar
          remaining={timer.remaining}
          label={timer.rest?.label || 'Descanso'}
          onAdd={() => timer.add(15)}
          onSkip={timer.stop}
        />
      )}

      <View
        style={{
          flexDirection: 'row',
          borderTopWidth: 1,
          borderColor: C.line,
          backgroundColor: C.surface,
          paddingBottom: 12 + insets.bottom,
        }}
      >
        {TABS.map(([id, icon, label]) => (
          <Pressable
            key={id}
            onPress={() => setTab(id)}
            style={{ flex: 1, alignItems: 'center', paddingTop: 10, paddingBottom: 12, gap: 4 }}
          >
            <Icon name={icon} size={19} color={tab === id ? C.accent : C.muted} />
            <Text
              style={{ fontSize: 10, fontWeight: '600', color: tab === id ? C.accent : C.muted }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ConfirmModal
        visible={confirmExit}
        title='Entrenamiento en curso'
        message='Si lo descartas pierdes las series registradas y el tiempo transcurrido. Para dejar la app abierta en segundo plano usa el botón de inicio (el entreno se conserva aunque Android cierre la app).'
        confirmLabel='Descartar'
        cancelLabel='Seguir'
        destructive
        onConfirm={() => {
          setConfirmExit(false);
          discardSession();
        }}
        onCancel={() => setConfirmExit(false)}
      />
    </View>
  );
}
