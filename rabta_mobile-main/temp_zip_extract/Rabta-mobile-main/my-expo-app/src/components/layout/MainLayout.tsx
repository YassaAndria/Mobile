import React, { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { CallProvider } from "../../context/CallContext";
import { useTheme } from "../../theme/ThemeContext";
import { AppStatusBar } from "./AppStatusBar";
import BottomTabBar from "./BottomTabBar";

export const MainLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { colors } = useTheme();

  return (
    <CallProvider>
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <AppStatusBar />
        <View style={styles.main}>
          {children}
        </View>
        <BottomTabBar />
      </View>
    </CallProvider>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "column",
    height: "100%",
  },
  main: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
});
