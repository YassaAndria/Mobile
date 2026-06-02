import React from "react";
import { StatusBar } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

export function AppStatusBar() {
  const { isDark, colors } = useTheme();

  return (
    <StatusBar
      barStyle={isDark ? "light-content" : "dark-content"}
      backgroundColor="transparent"
      translucent={true}
    />
  );
}
