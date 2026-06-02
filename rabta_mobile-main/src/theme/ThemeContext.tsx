import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";

const THEME_KEY = "theme";

export type ThemeMode = "light" | "dark";

export const palette = {
  light: {
    bg: "#FAFAFA",
    bgAlt: "#F8F7FC",
    surface: "#FFFFFF",
    surface2: "#FAFAFA",
    border: "#F3F4F6",
    borderStrong: "#E5E7EB",
    text: "#171717",
    textMuted: "#6B7280",
    textSubtle: "#9CA3AF",
    purple: "#7C3AED",
    purpleDark: "#6D28D9",
    purpleSoft: "#F3E8FF",
    purple10: "rgba(124, 58, 237, 0.1)",
    errorBg: "#FEF2F2",
    errorBorder: "#FECACA",
    errorText: "#DC2626",
    successBg: "#DCFCE7",
    successText: "#15803D",
    green: "#22C55E",
    red: "#EF4444",
  },
  dark: {
    bg: "#171717",
    bgAlt: "#121212",
    surface: "#262626",
    surface2: "#1E1E1E",
    border: "rgba(255,255,255,0.05)",
    borderStrong: "rgba(255,255,255,0.1)",
    text: "#F5F5F5",
    textMuted: "rgba(255,255,255,0.4)",
    textSubtle: "rgba(255,255,255,0.5)",
    purple: "#8B5CF6",
    purpleDark: "#7C3AED",
    purpleSoft: "rgba(124, 58, 237, 0.2)",
    purple10: "rgba(139, 92, 246, 0.1)",
    errorBg: "rgba(127, 29, 29, 0.2)",
    errorBorder: "rgba(220, 38, 38, 0.3)",
    errorText: "#F87171",
    successBg: "rgba(20, 83, 45, 0.2)",
    successText: "#4ADE80",
    green: "#22C55E",
    red: "#F87171",
  },
};

type ThemeContextValue = {
  mode: ThemeMode;
  colors: (typeof palette)["light"];
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (m: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const system = useColorScheme();
  // ✅ نقرأ system مرة واحدة عند أول render - مش نحطها في deps
  const systemRef = useRef(system);
  const [mode, setMode] = useState<ThemeMode>("light");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY);
        if (saved === "dark" || saved === "light") {
          setMode(saved);
        } else if (systemRef.current === "dark") {
          // ✅ بنستخدم الـ ref مش الـ state عشان مش محتاجين dependency
          setMode("dark");
        }
      } catch {
        /* ignore */
      } finally {
        setHydrated(true);
      }
    })();
  }, []); // ✅ [] - بيشتغل مرة واحدة بس

  const setTheme = useCallback(async (m: ThemeMode) => {
    setMode(m);
    await AsyncStorage.setItem(THEME_KEY, m);
  }, []);

  const toggleTheme = useCallback(() => {
    setMode(prev => {
      const next: ThemeMode = prev === "dark" ? "light" : "dark";
      AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const isDark = mode === "dark";
  const colors = isDark ? palette.dark : palette.light;

  const value = useMemo(
    () => ({ mode, colors, isDark, toggleTheme, setTheme }),
    [mode, toggleTheme, setTheme],
  );

  if (!hydrated) return null;

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
