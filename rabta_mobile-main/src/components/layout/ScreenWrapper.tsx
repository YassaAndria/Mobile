/**
 * ScreenWrapper — reusable layout shell that handles:
 * 1. SafeAreaView (respects notch, status bar, home indicator)
 * 2. KeyboardAvoidingView (iOS padding / Android height)
 * 3. Optional ScrollView with keyboardShouldPersistTaps
 *
 * Usage:
 *   <ScreenWrapper scroll>
 *     <Text>Content that scrolls and avoids the keyboard</Text>
 *   </ScreenWrapper>
 */
import React, { type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeContext";
import { AppStatusBar } from "./AppStatusBar";

interface ScreenWrapperProps {
  children: ReactNode;
  /** Wrap children in a ScrollView. Default: false */
  scroll?: boolean;
  /** Extra style for the ScrollView's contentContainer */
  contentContainerStyle?: ViewStyle;
  /** Extra style for the outer container */
  style?: ViewStyle;
  /** Skip the safe-area top inset (e.g. screens inside a tab navigator that already handle it) */
  noTopInset?: boolean;
  /** Skip the safe-area bottom inset */
  noBottomInset?: boolean;
  /** Extra bottom padding added *inside* the scroll area so the submit button isn't glued to the keyboard */
  extraBottomPadding?: number;
}

export default function ScreenWrapper({
  children,
  scroll = false,
  contentContainerStyle,
  style,
  noTopInset = false,
  noBottomInset = false,
  extraBottomPadding = 24,
}: ScreenWrapperProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: noTopInset ? 0 : insets.top,
    paddingBottom: noBottomInset ? 0 : insets.bottom,
    ...style,
  };

  const inner = scroll ? (
    <ScrollView
      contentContainerStyle={[
        { flexGrow: 1, paddingBottom: extraBottomPadding },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, contentContainerStyle]}>{children}</View>
  );

  return (
    <View style={containerStyle}>
      <AppStatusBar />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {inner}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
