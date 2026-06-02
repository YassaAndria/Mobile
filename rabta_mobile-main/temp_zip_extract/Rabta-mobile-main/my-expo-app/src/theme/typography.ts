import { Platform } from "react-native";

export const typography = {
  // Headings
  h1: {
    fontSize: 32,
    fontWeight: "800" as const,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: "700" as const,
    letterSpacing: -0.5,
  },
  h3: {
    fontSize: 20,
    fontWeight: "600" as const,
  },
  
  // Body text
  bodyLarge: {
    fontSize: 18,
    fontWeight: "400" as const,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  
  // Specific usages
  label: {
    fontSize: 14,
    fontWeight: "600" as const,
    letterSpacing: 0.5,
  },
  button: {
    fontSize: 16,
    fontWeight: "700" as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: "500" as const,
  },
};
