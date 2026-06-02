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
    gradientStart: "#0A1628",
    gradientMid: "#0F2744",
    gradientEnd: "#0A1628",
    screenBg: "#0A1628",
    glassBg: "rgba(255, 255, 255, 0.08)",
    glassBorder: "rgba(255, 255, 255, 0.14)",
    glassHighlight: "rgba(255, 255, 255, 0.12)",
    textPrimary: "#F0F4F8",
    textMuted: "#94A3B8",
    accent: "#3B82F6",
    accentContrast: "#FFFFFF",
    inputBg: "rgba(0,0,0,0.2)",
    divider: "rgba(255,255,255,0.14)",
    modalBackdrop: "rgba(0,0,0,0.65)",
    mahogany: "#722F37",
    mahoganyDark: "#5C252C",
    mahoganyLight: "#8B3A42",
    dangerBorder: "rgba(114, 47, 55, 0.35)",
  },
  light: {
    gradientStart: "#F8FAFC",
    gradientMid: "#EEF4FF",
    gradientEnd: "#F6F8FC",
    screenBg: "#F6F8FC",
    glassBg: "rgba(15, 23, 42, 0.07)",
    glassBorder: "rgba(15, 23, 42, 0.18)",
    glassHighlight: "rgba(15, 23, 42, 0.12)",
    textPrimary: "#0F172A",
    textMuted: "#334155",
    accent: "#2563EB",
    accentContrast: "#FFFFFF",
    inputBg: "rgba(255,255,255,0.9)",
    divider: "rgba(15,23,42,0.18)",
    modalBackdrop: "rgba(2,6,23,0.48)",
    mahogany: "#8D2A31",
    mahoganyDark: "#731F26",
    mahoganyLight: "#B02A37",
    dangerBorder: "rgba(176, 42, 55, 0.3)",
  },
};

export const getGroupDetailsPalette = (mode: ThemeMode): GroupDetailsPalette =>
  groupDetailsTheme[mode];
