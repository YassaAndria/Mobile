import type { ThemeMode } from "./ThemeContext";

export type GroupDetailsPalette = {
  gradientStart: string;
  gradientMid: string;
  gradientEnd: string;
  screenBg: string;
  glassBg: string;
  glassBorder: string;
  glassHighlight: string;
  textPrimary: string;
  textMuted: string;
  accent: string;
  accentContrast: string;
  inputBg: string;
  divider: string;
  modalBackdrop: string;
  mahogany: string;
  mahoganyDark: string;
  mahoganyLight: string;
  dangerBorder: string;
};

export const groupDetailsTheme: Record<ThemeMode, GroupDetailsPalette> = {
  dark: {
    gradientStart: "#171717",
    gradientMid: "#121212",
    gradientEnd: "#171717",
    screenBg: "#171717",
    glassBg: "rgba(38, 38, 38, 0.8)",
    glassBorder: "rgba(255, 255, 255, 0.05)",
    glassHighlight: "rgba(139, 92, 246, 0.1)",
    textPrimary: "#F5F5F5",
    textMuted: "rgba(255, 255, 255, 0.4)",
    accent: "#8B5CF6",
    accentContrast: "#FFFFFF",
    inputBg: "#1E1E1E",
    divider: "rgba(255, 255, 255, 0.05)",
    modalBackdrop: "rgba(0, 0, 0, 0.65)",
    mahogany: "#EF4444",
    mahoganyDark: "#B91C1C",
    mahoganyLight: "#F87171",
    dangerBorder: "rgba(239, 68, 68, 0.2)",
  },
  light: {
    gradientStart: "#FAFAFA",
    gradientMid: "#F8F7FC",
    gradientEnd: "#FAFAFA",
    screenBg: "#FAFAFA",
    glassBg: "rgba(255, 255, 255, 0.9)",
    glassBorder: "#E5E7EB",
    glassHighlight: "rgba(124, 58, 237, 0.08)",
    textPrimary: "#171717",
    textMuted: "#6B7280",
    accent: "#7C3AED",
    accentContrast: "#FFFFFF",
    inputBg: "#FFFFFF",
    divider: "#F3F4F6",
    modalBackdrop: "rgba(0, 0, 0, 0.4)",
    mahogany: "#DC2626",
    mahoganyDark: "#991B1B",
    mahoganyLight: "#EF4444",
    dangerBorder: "rgba(220, 38, 38, 0.15)",
  },
};

export const getGroupDetailsPalette = (mode: ThemeMode): GroupDetailsPalette =>
  groupDetailsTheme[mode];
