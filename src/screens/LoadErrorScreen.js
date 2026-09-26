import React, { useState } from 'react';
import { ScrollView, Text, Pressable } from 'react-native';
import { Icon } from '../components/Icon';
import { C, S } from '../theme';
import { dumpRaw } from '../storage';
import { writeAndShare } from '../share';

// Se muestra si los datos guardados no se pueden leer. La app NO guarda nada
// en este estado, para no sobrescribir el historial real.
export default function LoadErrorScreen({ error, onRetry, insets }) {
  const [busy, setBusy] = useState(false);
  const rescue = async () => {
    setBusy(true);
    try {
      const raw = await dumpRaw();
      await writeAndShare('ironlog-rescate.json', JSON.stringify(raw, null, 2));
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 24, paddingTop: insets.top + 48 }}
    >
      <Icon name='alert-triangle' size={40} color={C.negative} />
      <Text style={[S.disp, { marginTop: 14 }]}>No se pudieron leer tus datos</Text>
      <Text style={[S.sub, { marginTop: 10, lineHeight: 19 }]}>
        Tus datos siguen en el dispositivo y no se ha modificado nada. Reintenta; si el problema
        continúa, exporta la copia de rescate y restáurala desde Datos o envíala para recuperarla.
      </Text>
      <Text style={[S.sub, { marginTop: 12, fontSize: 12, color: C.negative }]}>
        {String(error?.message || error)}
      </Text>
      <Pressable style={[S.btn, { marginTop: 24 }]} onPress={onRetry}>
        <Icon name='refresh-cw' size={16} />
        <Text style={S.btnText}>Reintentar</Text>
      </Pressable>
      <Pressable style={[S.btn, S.btnGhost, { marginTop: 10 }]} onPress={rescue} disabled={busy}>
        <Icon name='download' size={16} color={C.text} />
        <Text style={S.btnTextGhost}>{busy ? 'Exportando…' : 'Exportar copia de rescate'}</Text>
      </Pressable>
    </ScrollView>
  );
}
