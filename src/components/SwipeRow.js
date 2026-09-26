import React, { useRef } from 'react';
import { Animated, PanResponder } from 'react-native';

// Fila deslizable: izquierda → borrar, derecha → alternar "saltada".
// El PanResponder se crea una sola vez, así que los callbacks se leen de un
// ref para usar siempre los de la última render (no los de la primera).
// Debe llevar una `key` estable por elemento (no el índice): al borrar, el
// componente animado desaparece con su elemento.
export function SwipeRow({ onDelete, onSkip, children }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const cb = useRef({ onDelete, onSkip });
  cb.current = { onDelete, onSkip };

  const back = () => Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dy) < 15,
      onPanResponderMove: (_, g) => translateX.setValue(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -70) {
          Animated.timing(translateX, {
            toValue: -400,
            duration: 180,
            useNativeDriver: true,
          }).start(() => cb.current.onDelete());
        } else if (g.dx > 70) {
          back();
          cb.current.onSkip();
        } else back();
      },
      onPanResponderTerminate: back,
    }),
  ).current;

  return (
    <Animated.View style={{ transform: [{ translateX }] }} {...pan.panHandlers}>
      {children}
    </Animated.View>
  );
}
