/**
 * Rabta Design System
 * ==================
 * Centralized design tokens for consistency across the entire app.
 * Import from this file instead of hardcoding values.
 *
 * Usage:
 *   import { spacing, radius, shadows } from '../theme/design-system';
 */

/** Spacing scale (4px base) */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
  "4xl": 64,
} as const;

/** Border radius tokens */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

/** Shadow presets */
export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  elevated: {
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
} as const;

/**
 * Re-export palette from ThemeContext and typography for a single import.
 *
 *   import { palette } from '../theme/ThemeContext';
 *   import { typography } from '../theme/typography';
 *   import { spacing, radius, shadows } from '../theme/design-system';
 *
 * Button variants are handled by:
 *   import { Button } from '../components/ui/Button';
 *   <Button title="..." variant="primary|secondary|outline|danger|ghost" size="sm|md|lg" />
 */
