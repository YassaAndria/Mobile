/* eslint-disable @typescript-eslint/no-explicit-any */
import { zodResolver } from "@hookform/resolvers/zod";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useDispatch } from "react-redux";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { z } from "zod";
import { loginUser } from "../../src/api/auth";
import { getApiErrorMessage } from "../../src/api/getApiErrorMessage";
import { Button } from "../../src/components/ui/Button";
import { setCredentials } from "../../src/store/slices/authSlice";
import { useTheme } from "../../src/theme/ThemeContext";
import { typography } from "../../src/theme/typography";

const loginSchema = z.object({
  email: z.string().min(1, "Email or phone is required").email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

const getApiBase = () => {
  const configUrl = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;
  if (configUrl && configUrl !== "EXPO_PUBLIC_API_BASE_URL") {
    return configUrl;
  }
  return process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";
};

// Configure Google Sign-in library to read process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
// Disabled because this project currently runs on Expo Go. RNGoogleSignin requires native build / prebuild.
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

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response) {
      if (response.type === "success") {
        const token = response.authentication?.idToken || response.params?.id_token;
        if (token) {
          void handleGoogleToken(token);
        } else {
          console.warn("No ID token returned in Google response:", response);
          Toast.show({ type: "error", text1: "No ID Token returned from Google." });
          setGoogleLoading(false);
        }
      } else {
        setGoogleLoading(false);
      }
    }
  }, [response]);

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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={isDark ? ['rgba(108, 99, 255, 0.15)', 'transparent'] : ['rgba(108, 99, 255, 0.1)', 'transparent']}
          style={styles.gradientBg}
        />

        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.scrollPadding}>
          <View style={styles.card}>


            <View style={styles.centerBlock}>
              <Text style={[styles.titleText, { color: colors.text }]}>Welcome Back</Text>
              <Text style={[typography.body, { color: colors.textSubtle }]}>
                Sign in to your account to continue
              </Text>
            </View>

            {apiError ? (
              <View style={[styles.banner, { backgroundColor: colors.errorBg, borderColor: colors.errorText }]}>
                <MaterialIcons name="error-outline" size={20} color={colors.errorText} />
                <Text style={[styles.bannerText, { color: colors.errorText }]}>{apiError}</Text>
              </View>
            ) : null}

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={[typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Email</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={[
                    styles.inputContainer,
                    {
                      backgroundColor: isDark ? "#1A1A1A" : colors.surface2,
                      borderColor: errors.email ? colors.errorText : (isDark ? "#333" : colors.borderStrong)
                    }
                  ]}>
                    <MaterialIcons name="email" size={20} color={colors.textSubtle} style={styles.inputLeadingIcon} />
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Enter your email"
                      placeholderTextColor={colors.textSubtle}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      style={[styles.inputField, { color: colors.text }]}
                    />
                  </View>
                )}
              />
              {errors.email ? (
                <Text style={[typography.caption, { color: colors.errorText, marginTop: 6 }]}>{errors.email.message}</Text>
              ) : null}
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={[typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Password</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={[
                    styles.inputContainer,
                    {
                      backgroundColor: isDark ? "#1A1A1A" : colors.surface2,
                      borderColor: errors.password ? colors.errorText : (isDark ? "#333" : colors.borderStrong)
                    }
                  ]}>
                    <MaterialIcons name="lock" size={20} color={colors.textSubtle} style={styles.inputLeadingIcon} />
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry={!showPassword}
                      placeholder="Enter your password"
                      placeholderTextColor={colors.textSubtle}
                      style={[styles.inputField, { color: colors.text, paddingRight: 48 }]}
                    />
                    <Pressable style={styles.eye} onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                      <MaterialIcons name={showPassword ? "visibility-off" : "visibility"} size={22} color={colors.textSubtle} />
                    </Pressable>
                  </View>
                )}
              />
              {errors.password ? (
                <Text style={[typography.caption, { color: colors.errorText, marginTop: 6 }]}>{errors.password.message}</Text>
              ) : null}
            </View>

            <View style={styles.forgotRow}>
              <Pressable onPress={() => router.push("/forgot-password")}>
                <Text style={{ color: colors.purple, fontSize: 14, fontWeight: "600" }}>Forgot Password?</Text>
              </Pressable>
            </View>

            {/* Primary Button */}
            <Pressable
              style={styles.primaryBtn}
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
                OR CONTINUE WITH
              </Text>
              <View style={[styles.line, { backgroundColor: isDark ? "#333" : colors.borderStrong }]} />
            </View>

            <Pressable
              style={[
                styles.secondaryBtn,
                { backgroundColor: isDark ? "#262626" : "#FFFFFF", borderColor: isDark ? "#444" : "#E5E5E5" }
              ]}
              onPress={handleGoogleLogin}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="logo-google" size={22} color={isDark ? "#FFF" : "#4285F4"} style={{ marginRight: 12 }} />
                  <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Log in with Google</Text>
                </View>
              )}
            </Pressable>

            <View style={styles.footerRow}>
              <Text style={[typography.body, { color: colors.textSubtle }]}>Don&apos;t have an account? </Text>
              <Pressable onPress={() => router.push("/signup")} hitSlop={10}>
                <Text style={{ color: colors.purple, fontWeight: "700" }}>Sign Up</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    zIndex: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollPadding: { paddingHorizontal: 24, alignItems: "center" },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: 0,
    marginTop: 10,
  },
  iconWrapper: {
    marginBottom: 24,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  centerBlock: { alignItems: "flex-start", marginBottom: 32 },
  titleText: { fontSize: 36, fontWeight: "800", letterSpacing: -1, marginBottom: 8 },
  banner: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  bannerText: { fontSize: 14, fontWeight: "600", flex: 1 },

  inputGroup: { marginBottom: 20 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    height: 56,
    overflow: "hidden"
  },
  inputLeadingIcon: {
    paddingLeft: 16,
    paddingRight: 12,
  },
  inputField: {
    flex: 1,
    height: "100%",
    fontSize: 16,
  },
  passWrap: { position: "relative" },
  eye: { position: "absolute", right: 16, top: 0, bottom: 0, justifyContent: "center" },
  forgotRow: { alignSelf: "flex-end", marginBottom: 32, marginTop: -4 },

  primaryBtn: {
    backgroundColor: "#7C3AED",
    width: "100%",
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 5,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  secondaryBtn: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },

  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 32 },
  line: { flex: 1, height: 1 },
  dividerMid: { paddingHorizontal: 16, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  footerRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 40 },
});
