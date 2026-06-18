import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Icon } from './src/components/Icon';
import { C, S } from './src/theme';
import { loadData, saveData } from './src/storage';
import { migrate, seed } from './src/dataModel';
import { mmss } from './src/helpers';
import TodayScreen from './src/screens/TodayScreen';
import RoutinesScreen from './src/screens/RoutinesScreen';
import ExercisesScreen from './src/screens/ExercisesScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import DataScreen from './src/screens/DataScreen';

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
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('today');
  const [session, setSession] = useState(null);
  const [rest, setRest] = useState(0);
  const [restLabel, setRestLabel] = useState('Descanso');
  const loaded = useRef(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      const d = await loadData();
      setData(d ? migrate(d) : seed());
      loaded.current = true;
    })();
  }, []);
  useEffect(() => {
    if (loaded.current && data) saveData(data);
  }, [data]);
  useEffect(() => {
    if (rest <= 0) return;
    const t = setInterval(() => setRest((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [rest > 0]);

  if (!data)
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
  const startRest = (secs, label) => {
    setRest(secs || data.settings.restSeconds || 90);
    setRestLabel(label || 'Descanso');
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
            {session && tab === 'today'
              ? 'Entrenamiento en curso'
              : TITLES[tab][1]}
          </Text>
        </View>
        <Icon name='dumbbell' size={26} color={C.accent} />
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'today' && (
          <TodayScreen
            data={data}
            setData={setData}
            session={session}
            setSession={setSession}
            unit={unit}
            startRest={startRest}
            stopRest={() => setRest(0)}
          />
        )}
        {tab === 'routines' && (
          <RoutinesScreen data={data} setData={setData} unit={unit} />
        )}
        {tab === 'exercises' && (
          <ExercisesScreen data={data} setData={setData} />
        )}
        {tab === 'progress' && <ProgressScreen data={data} unit={unit} />}
        {tab === 'data' && <DataScreen data={data} setData={setData} />}
      </View>

      {rest > 0 && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: C.surface,
            borderTopWidth: 1,
            borderColor: C.accent,
          }}
        >
          <Icon name='clock' size={18} color={C.accent} />
          <Text style={S.sub}>{restLabel}</Text>
          <Text
            style={{
              color: C.accent,
              fontSize: 26,
              fontWeight: '800',
              minWidth: 64,
            }}
          >
            {mmss(rest)}
          </Text>
          <View style={{ flex: 1 }} />
          <Pressable style={S.iconBtn} onPress={() => setRest((r) => r + 15)}>
            <Icon name='plus' size={15} color={C.muted} />
          </Pressable>
          <Pressable style={S.iconBtn} onPress={() => setRest(0)}>
            <Icon name='skip-forward' size={15} color={C.muted} />
          </Pressable>
        </View>
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
            style={{
              flex: 1,
              alignItems: 'center',
              paddingTop: 10,
              paddingBottom: 12,
              gap: 4,
            }}
          >
            <Icon
              name={icon}
              size={19}
              color={tab === id ? C.accent : C.muted}
            />
            <Text
              style={{
                fontSize: 10,
                fontWeight: '600',
                color: tab === id ? C.accent : C.muted,
              }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
