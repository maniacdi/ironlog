import React from "react";
import { View, TextInput, Pressable } from "react-native";
import { Icon } from "./Icon";
import { C } from "../theme";

export function Stepper({ value, onChange, step = 1, min = 0 }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line, borderRadius: 10, overflow: "hidden" }}>
      <Pressable onPress={() => onChange(Math.max(min, +(value - step).toFixed(2)))} style={{ width: 32, height: 40, alignItems: "center", justifyContent: "center" }}>
        <Icon name="minus" size={15} color={C.text} />
      </Pressable>
      <TextInput
        value={String(value)} keyboardType="decimal-pad"
        onChangeText={(t) => { const v = parseFloat(t); onChange(isNaN(v) ? 0 : v); }}
        style={{ width: 46, textAlign: "center", color: C.text, fontSize: 16, fontWeight: "700", padding: 0 }}
      />
      <Pressable onPress={() => onChange(+(value + step).toFixed(2))} style={{ width: 32, height: 40, alignItems: "center", justifyContent: "center" }}>
        <Icon name="plus" size={15} color={C.text} />
      </Pressable>
    </View>
  );
}
