/* eslint-disable @typescript-eslint/no-explicit-any */
import axiosInstance from "../src/api/axiosInstance";
import { setCredentials } from "../src/store/slices/authSlice";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useDispatch } from "react-redux";
import Toast from "react-native-toast-message";
import { useTheme } from "../src/theme/ThemeContext";
import { typography } from "../src/theme/typography";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginSuccessScreen() {
  const params = useLocalSearchParams<{ token?: string; profileComplete?: string }>();
  const router = useRouter();
  const dispatch = useDispatch();
  const { colors, isDark } = useTheme();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const run = async () => {
      const token = typeof params.token === "string" ? params.token : undefined;
      const profileCompleteStr = typeof params.profileComplete === "string" ? params.profileComplete : undefined;
      const profileComplete = profileCompleteStr === "true";

      if (!token) {
        Toast.show({ type: "error", text1: "Authentication failed. Missing token." });
        router.replace("/login");
        return;
      }

      try {
        await AsyncStorage.setItem("token", token);
        const response = await axiosInstance.get("/profile/me");
        const user = response.data.data.user;
        dispatch(setCredentials({ user, token }));
        Toast.show({ type: "success", text1: "Successfully logged in with Google!" });
        const userId = user.id || user._id;
        const hasLoggedInKey = `has_logged_in_${userId}`;
        const hasLoggedInBefore = await AsyncStorage.getItem(hasLoggedInKey);

        if (hasLoggedInBefore === "true") {
          router.replace("/chats");
        } else {
          await AsyncStorage.setItem(hasLoggedInKey, "true");
          if (user.role === "employer" && profileComplete) {
            router.replace("/employer-dashboard");
          } else if (!profileComplete) {
            router.replace("/setup-profile");
          } else {
            router.replace("/freelancer-dashboard");
          }
        }
      } catch {
        await AsyncStorage.removeItem("token");
        Toast.show({ type: "error", text1: "Authentication failed. Please try again." });
        router.replace("/login");
      }
    };

    void run();
  }, [dispatch, params.profileComplete, params.token, router]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ActivityIndicator size="large" color={colors.purple} style={{ marginBottom: 16 }} />
      <Text style={[typography.h3, { color: colors.text, marginBottom: 8 }]}>Authenticating...</Text>
      <Text style={[typography.body, { color: colors.textSubtle, textAlign: "center" }]}>Please wait while we log you in securely.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
});
