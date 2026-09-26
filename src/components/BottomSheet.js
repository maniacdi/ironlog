import React from 'react';
import { Modal, View, Pressable } from 'react-native';
import { C } from '../theme';

// Hoja inferior modal con tirador; se cierra tocando fuera o con "atrás".
export function BottomSheet({ visible, onClose, maxHeight = '80%', padding = 16, children }) {
  return (
    <Modal visible={visible} transparent animationType='slide' onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(8,9,11,0.6)' }} onPress={onClose} />
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight,
          backgroundColor: C.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderTopWidth: 1,
          borderColor: C.line,
          padding,
        }}
      >
        <View
          style={{
            width: 38,
            height: 4,
            backgroundColor: C.line,
            borderRadius: 2,
            alignSelf: 'center',
            marginBottom: 14,
          }}
        />
        {children}
      </View>
    </Modal>
  );
}
