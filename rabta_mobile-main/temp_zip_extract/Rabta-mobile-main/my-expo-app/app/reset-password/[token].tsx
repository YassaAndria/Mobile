/* eslint-disable @typescript-eslint/no-explicit-any */
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useDispatch } from "react-redux";
import Toast from "react-native-toast-message";
import axiosInstance from "../../src/api/axiosInstance";
import { logout } from "../../src/store/slices/authSlice";
import { useTheme } from "../../src/theme/ThemeContext";
import { Button } from "../../src/components/ui/Button";
import { typography } from "../../src/theme/typography";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const dispatch = useDispatch();
  const { colors, isDark } = useTheme();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    dispatch(logout());
  }, [dispatch]);

  const handleSubmit = async () => {
    if (password !== confirmPassword) {
      Toast.show({ type: "error", text1: "Passwords do not match" });
      return;
    }
    if (password.length < 8) {
      Toast.show({ type: "error", text1: "Password must be at least 8 characters long" });
      return;
    }
    try {
      setIsLoading(true);
      const res = await axiosInstance.post(`/auth/reset-password/${token}`, { password });
      Toast.show({ type: "success", text1: res.data.message || "Password updated successfully!" });
      router.replace("/login");
    } catch (error: any) {
      Toast.show({ type: "error", text1: error.response?.data?.message || "Failed to reset password. The token may be expired." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={[styles.root, { backgroundColor: colors.bg }]} keyboardShouldPersistTaps="handled">
      <View style={styles.inner}>
        <View style={[styles.iconBox, { backgroundColor: colors.purple }]}>
          <MaterialIcons name="password" size={28} color="#fff" />
        </View>
        <Text style={[typography.h1, { color: colors.text, textAlign: "center" }]}>Create new password</Text>
        <Text style={[typography.body, { color: colors.textSubtle, marginTop: 8, textAlign: "center", paddingHorizontal: 16 }]}>
          Your new password must be different from previous used passwords.
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[typography.label, { color: colors.textMuted, marginBottom: 8 }]}>New Password</Text>
        <View style={styles.inputRow}>
          <MaterialIcons name="lock" size={20} color={colors.textSubtle} style={styles.inputIcon} />
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textSubtle}
            style={[
              styles.input,
              { backgroundColor: colors.surface2, borderColor: colors.borderStrong, color: colors.text, paddingRight: 44 },
            ]}
          />
          <Pressable style={styles.eye} onPress={() => setShowPassword(!showPassword)}>
            <MaterialIcons name={showPassword ? "visibility-off" : "visibility"} size={20} color={colors.textSubtle} />
          </Pressable>
        </View>

        <Text style={[typography.label, { color: colors.textMuted, marginTop: 16, marginBottom: 8 }]}>Confirm New Password</Text>
        <View style={styles.inputRow}>
          <MaterialIcons name="lock-clock" size={20} color={colors.textSubtle} style={styles.inputIcon} />
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textSubtle}
            style={[
              styles.input,
              { backgroundColor: colors.surface2, borderColor: colors.borderStrong, color: colors.text },
            ]}
          />
        </View>

        <Button
          title="Reset Password"
          onPress={handleSubmit}
          isLoading={isLoading}
          style={{ marginTop: 24 }}
        />

        <Button
          title="Back to Login"
          variant="ghost"
          onPress={() => router.replace("/login")}
          style={{ marginTop: 16 }}
        />
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, justifyContent: "center", padding: 24 },
  inner: { alignItems: "center", marginBottom: 32 },
  iconBox: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  card: { maxWidth: 400, width: "100%", alignSelf: "center", padding: 32, borderRadius: 16, borderWidth: 1 },
  inputRow: { position: "relative" },
  inputIcon: { position: "absolute", left: 12, top: 14, zIndex: 1 },
  eye: { position: "absolute", right: 12, top: 14 },
  input: { paddingLeft: 40, paddingVertical: 12, borderRadius: 12, borderWidth: 1, fontSize: 14 },
});
