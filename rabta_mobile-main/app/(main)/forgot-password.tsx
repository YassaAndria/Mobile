/* eslint-disable @typescript-eslint/no-explicit-any */
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import axiosInstance from "../../src/api/axiosInstance";
import ScreenWrapper from "../../src/components/layout/ScreenWrapper";
import { useTheme } from "../../src/theme/ThemeContext";
import { Button } from "../../src/components/ui/Button";
import { typography } from "../../src/theme/typography";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      Toast.show({ type: "error", text1: "Please enter your email address" });
      return;
    }
    try {
      setIsLoading(true);
      await axiosInstance.post("/auth/forgot-password", { email });
      setIsSent(true);
      Toast.show({ type: "success", text1: "Reset link sent!" });
    } catch (error: any) {
      Toast.show({ type: "error", text1: error.response?.data?.message || "Failed to send reset link" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenWrapper scroll contentContainerStyle={styles.root} extraBottomPadding={48}>
      <View style={styles.inner}>
        <View style={[styles.iconBox, { backgroundColor: colors.purple }]}>
          <MaterialIcons name="lock-reset" size={28} color="#fff" style={{ transform: [{ rotate: "-12deg" }] }} />
        </View>
        <Text style={[typography.h1, { color: colors.text, textAlign: "center", marginBottom: 8 }]}>Reset your password</Text>
        <Text style={[typography.body, { color: colors.textSubtle, textAlign: "center", marginBottom: 8 }]}>
          Or return to login below
        </Text>
        <Button
          title="Return to login"
          variant="secondary"
          onPress={() => router.replace("/login")}
        />
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {isSent ? (
          <View style={styles.sent}>
            <View style={[styles.okCircle, { backgroundColor: colors.successBg }]}>
              <MaterialIcons name="mark-email-read" size={28} color={colors.successText} />
            </View>
            <Text style={[typography.h3, { color: colors.text, marginBottom: 8 }]}>Check your email</Text>
            <Text style={[typography.body, { color: colors.textSubtle, textAlign: "center", marginBottom: 24 }]}>
              If an account exists for <Text style={{ fontWeight: "700", color: colors.text }}>{email}</Text>, a reset link has been sent to your email.
            </Text>
            <Button title="Try another email" variant="ghost" onPress={() => setIsSent(false)} />
          </View>
        ) : (
          <View>
            <Text style={[typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Email address</Text>
            <View style={styles.inputRow}>
              <MaterialIcons name="email" size={20} color={colors.textSubtle} style={styles.inputIcon} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="you@example.com"
                placeholderTextColor={colors.textSubtle}
                style={[
                  styles.input,
                  { backgroundColor: colors.surface2, borderColor: colors.borderStrong, color: colors.text },
                ]}
              />
            </View>
            <Button
              title="Send Reset Link"
              onPress={handleSubmit}
              isLoading={isLoading}
              style={{ marginTop: 24 }}
            />
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, justifyContent: "center", padding: 24 },
  inner: { alignItems: "center", marginBottom: 32 },
  iconBox: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 24, transform: [{ rotate: "12deg" }] },
  inputIcon: { position: "absolute", left: 12, top: 14, zIndex: 1 },
  input: { paddingLeft: 40, paddingVertical: 12, borderRadius: 12, borderWidth: 1, fontSize: 14 },
  sent: { alignItems: "center" },
  okCircle: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  card: { padding: 24, borderRadius: 16, borderWidth: 1 },
  inputRow: { position: "relative" },
});
