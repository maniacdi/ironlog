import React from "react";
import { Feather, Ionicons } from "@expo/vector-icons";

export function Icon({ name, size = 20, color = "#fff" }) {
  if (name === "dumbbell") return <Ionicons name="barbell-outline" size={size} color={color} />;
  if (name === "flame") return <Ionicons name="flame" size={size} color={color} />;
  return <Feather name={name} size={size} color={color} />;
}
