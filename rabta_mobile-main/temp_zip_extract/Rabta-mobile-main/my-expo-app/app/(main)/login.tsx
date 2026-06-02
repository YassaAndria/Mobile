/* eslint-disable @typescript-eslint/no-explicit-any */
import { zodResolver } from "@hookform/resolvers/zod";
import { MaterialIcons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { GoogleSignin, statusCodes, isSuccessResponse, isErrorWithCode } from '@react-native-google-signin/google-signin';
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../src/store/store";
import { Controller, useForm } from "react-hook-form";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { z } from "zod";
import { loginUser } from "../../src/api/auth";
import { getApiErrorMessage } from "../../src/api/getApiErrorMessage";
import { Input } from "../../src/components/ui/Input";
import { Button } from "../../src/components/ui/Button";
import ScreenWrapper from "../../src/components/layout/ScreenWrapper";
import { setCredentials } from "../../src/store/slices/authSlice";
import { useTheme } from "../../src/theme/ThemeContext";
import { typography } from "../../src/theme/typography";

const loginSchema = z.object({
  email: z.string().min(1, "Email or phone is required").email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

const getApiBase = () =>
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api/v1";

// Configure Google Sign-in library to read process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

// Google OAuth Client IDs
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "";

// Pre-warm the browser for faster auth popup
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const authUser = useSelector((s: RootState) => s.auth.user);
  const { colors, isDark } = useTheme();
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!authUser?.jobTitle && !authUser?.bioHeadline) {
      router.replace("/setup-profile");
    } else {
      router.replace("/chats");
    }
  }, [isAuthenticated, authUser, router]);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Hook states used for form validation and styling

  const handleGoogleToken = async (idToken: string) => {
    setGoogleLoading(true);
    try {
      const baseURL = getApiBase();
      const res = await fetch(`${baseURL}/auth/google/mobile-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();

      if (!res.ok || data.status !== "success") {
        const msg = data.message || "Google login failed.";
        setApiError(msg);
        Toast.show({ type: "error", text1: msg });
        return;
      }

      await AsyncStorage.setItem("token", data.data.token);
      await AsyncStorage.setItem("user", JSON.stringify(data.data.user));
      dispatch(setCredentials({ user: data.data.user, token: data.data.token }));
      Toast.show({ type: "success", text1: "Successfully logged in with Google!" });

      if (data.data.user.role === "employer" && data.data.profileComplete) {
        router.replace("/employer-dashboard");
      } else if (!data.data.profileComplete) {
        router.replace("/setup-profile");
      } else {
        router.replace("/freelancer-dashboard");
      }
    } catch (error: any) {
      const msg = error?.message || "Google login failed. Please try again.";
      setApiError(msg);
      Toast.show({ type: "error", text1: msg });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        const idToken = response.data.idToken;
        if (idToken) {
          // =======================================================================
          // EXACTLY HERE: Send this idToken to your backend!
          // 
          // Example fetch or axios request:
          // const response = await fetch('YOUR_BACKEND_URL/auth/google', {
          //   method: 'POST',
          //   headers: { 'Content-Type': 'application/json' },
          //   body: JSON.stringify({ idToken })
          // });
          // =======================================================================
          void handleGoogleToken(idToken);
        } else {
          throw new Error("No ID token present!");
        }
      } else {
        // Sign in was cancelled by user
        console.log("User cancelled Google Sign-in");
      }
    } catch (error: any) {
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.IN_PROGRESS) {
          // operation (e.g. sign in) is in progress already
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          Toast.show({ type: "error", text1: "Play services not available or outdated" });
        } else {
          Toast.show({ type: "error", text1: error.message || "Google login failed." });
        }
      } else {
        Toast.show({ type: "error", text1: error?.message || "Google login failed." });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const onSubmit = async (data: LoginFormInputs) => {
    setApiError(null);
    try {
      const responseData = await loginUser({ email: data.email, password: data.password });
      dispatch(setCredentials({ user: responseData.user, token: responseData.token }));
      Toast.show({ type: "success", text1: "Successfully logged in!" });
      if (responseData.user.role === "employer" && responseData.profileComplete) {
        router.replace("/employer-dashboard");
      } else if (!responseData.profileComplete) {
        router.replace("/setup-profile");
      } else {
        router.replace("/freelancer-dashboard");
      }
    } catch (error: unknown) {
      const errorMessage = getApiErrorMessage(error, "Login failed. Please check your credentials.");
      setApiError(errorMessage);
      Toast.show({ type: "error", text1: errorMessage });
    }
  };


  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.scrollPadding}>
        <View style={styles.card}>
          <View style={styles.centerBlock}>
            <Text style={[styles.titleText, { color: colors.text }]}>Welcome Back</Text>
            <Text style={[typography.body, { color: colors.textSubtle }]}>
              Enter your credentials to continue
            </Text>
          </View>

          {apiError ? (
            <View style={[styles.banner, { backgroundColor: colors.errorBg, borderColor: colors.errorText }]}>
              <Text style={[styles.bannerText, { color: colors.errorText }]}>{apiError}</Text>
            </View>
          ) : null}

          <Text style={[typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Email</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Enter your email"
                placeholderTextColor={colors.textSubtle}
                autoCapitalize="none"
                keyboardType="email-address"
                style={[
                  styles.inputField,
                  {
                    backgroundColor: isDark ? "#1E1E1E" : colors.surface2,
                    borderColor: errors.email ? colors.errorText : (isDark ? "#333" : colors.borderStrong),
                    color: colors.text,
                  },
                ]}
              />
            )}
          />
          {errors.email ? <Text style={[typography.caption, { color: colors.errorText, marginBottom: 16, marginTop: 4 }]}>{errors.email.message}</Text> : <View style={{ height: 16 }} />}

          <Text style={[typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Password</Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.passWrap}>
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textSubtle}
                  style={[
                    styles.inputField,
                    {
                      paddingRight: 48,
                      backgroundColor: isDark ? "#1E1E1E" : colors.surface2,
                      borderColor: errors.password ? colors.errorText : (isDark ? "#333" : colors.borderStrong),
                      color: colors.text,
                    },
                  ]}
                />
                <Pressable style={styles.eye} onPress={() => setShowPassword(!showPassword)}>
                  <MaterialIcons name={showPassword ? "visibility-off" : "visibility"} size={22} color={colors.textSubtle} />
                </Pressable>
              </View>
            )}
          />
          {errors.password ? <Text style={[typography.caption, { color: colors.errorText, marginBottom: 8, marginTop: 4 }]}>{errors.password.message}</Text> : null}

          <View style={styles.forgotRow}>
            <Pressable onPress={() => router.push("/forgot-password")}>
              <Text style={{ color: "#6C63FF", fontSize: 13, fontWeight: "600" }}>Forgot Password?</Text>
            </Pressable>
          </View>

          {/* Primary Button */}
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              isSubmitting && { opacity: 0.7 }
            ]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>LOG IN</Text>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={[styles.line, { backgroundColor: isDark ? "#333" : colors.borderStrong }]} />
            <Text style={[styles.dividerMid, { backgroundColor: "transparent", color: colors.textSubtle }]}>
              OR
            </Text>
            <View style={[styles.line, { backgroundColor: isDark ? "#333" : colors.borderStrong }]} />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              { backgroundColor: isDark ? "#1E1E1E" : "transparent", borderColor: isDark ? "#333" : colors.text },
              pressed && { opacity: 0.8 }
            ]}
            onPress={handleGoogleLogin}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <>
                <MaterialIcons name="login" size={20} color={colors.text} />
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>CONTINUE WITH GOOGLE</Text>
              </>
            )}
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={[typography.body, { color: colors.textSubtle }]}>Don&apos;t have an account? </Text>
            <Pressable onPress={() => router.push("/signup")} hitSlop={10}>
              <Text style={{ color: "#6C63FF", fontWeight: "700" }}>Sign Up</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 0,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollPadding: { paddingHorizontal: 24, paddingTop: 16, alignItems: "center" },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: 0,
  },
  centerBlock: { alignItems: "flex-start", marginBottom: 32 },
  titleText: { fontSize: 32, fontWeight: "800", letterSpacing: -1, marginBottom: 8 },
  banner: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 24 },
  bannerText: { fontSize: 13, fontWeight: "600" },
  inputField: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    fontSize: 15,
  },
  passWrap: { position: "relative" },
  eye: { position: "absolute", right: 16, top: 16 },
  forgotRow: { alignSelf: "flex-end", marginBottom: 32, marginTop: 4 },

  primaryBtn: {
    backgroundColor: "#6C63FF",
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  secondaryBtn: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 32 },
  line: { flex: 1, height: 1 },
  dividerMid: { paddingHorizontal: 16, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  footerRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 40 },
});
