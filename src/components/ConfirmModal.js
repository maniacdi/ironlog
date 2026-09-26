import React from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { C, S } from '../theme';

// Diálogo de confirmación con el estilo de la app (Alert nativo desentona).
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(8,9,11,0.75)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 26,
        }}
        onPress={onCancel}
      >
        <Pressable
          style={{
            width: '100%',
            backgroundColor: C.surface,
            borderRadius: 4,
            padding: 20,
          }}
          onPress={() => {}}
        >
          <Text style={S.disp}>{title}</Text>
          {!!message && <Text style={[S.sub, { marginTop: 10, lineHeight: 19 }]}>{message}</Text>}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
            <Pressable style={[S.btn, S.btnGhost, { flex: 1 }]} onPress={onCancel}>
              <Text style={S.btnTextGhost}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[S.btn, { flex: 1 }, destructive && { backgroundColor: C.negative }]}
              onPress={onConfirm}
            >
              <Text style={S.btnText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
