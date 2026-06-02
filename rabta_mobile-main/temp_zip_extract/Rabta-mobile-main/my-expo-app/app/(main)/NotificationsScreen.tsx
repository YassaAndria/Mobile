import React, { useState } from 'react';
import {
  View,
  Text,
  Switch,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useAppSelector } from '../../src/store/hooks';
import { useTheme } from '../../src/theme/ThemeContext';
import { spacing as Spacing, radius as Radius } from '../../src/theme/design-system';
import { typography as Typography } from '../../src/theme/typography';

interface SettingItem {
  key: keyof typeof DEFAULTS;
  title: string;
  subtitle: string;
  isAi?: boolean;
}

const DEFAULTS = {
  chatMessages: true,
  communityMentions: true,
  aiJobMatches: true,
  inAppSounds: false,
};

const ITEMS: SettingItem[] = [
  {
    key: 'chatMessages',
    title: 'Chat Messages',
    subtitle: 'Get notified for new personal messages.',
  },
  {
    key: 'communityMentions',
    title: 'Community Mentions',
    subtitle: 'Notify me when someone tags me in a group.',
  },
  {
    key: 'aiJobMatches',
    title: 'AI Job Matches',
    subtitle: 'Let Rabta AI notify you about jobs matching your ITI track.',
    isAi: true,
  },
  {
    key: 'inAppSounds',
    title: 'In-App Sounds',
    subtitle: 'Play sounds for incoming messages and calls.',
  },
];

export default function NotificationsScreen() {
      const { colors, isDark } = useTheme();
  const theme = { colors };
  const s = styles(isDark, theme);

  const [settings, setSettings] = useState(DEFAULTS);

  const toggle = (key: keyof typeof DEFAULTS) =>
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Notifications</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionLabel}>PUSH ALERTS</Text>

        <View style={s.card}>
          {ITEMS.map((item, idx) => (
            <View
              key={item.key}
              style={[s.row, idx < ITEMS.length - 1 && s.rowBorder]}>
              <View style={s.rowText}>
                <Text
                  style={[
                    s.rowTitle,
                    item.isAi && { color: colors.purple },
                  ]}>
                  {item.isAi ? '⚡ ' : ''}
                  {item.title}
                </Text>
                <Text style={s.rowSubtitle}>{item.subtitle}</Text>
              </View>
              <Switch
                value={settings[item.key]}
                onValueChange={() => toggle(item.key)}
                trackColor={{ false: theme.colors.border, true: colors.purple }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (isDark: boolean, theme: { colors: any }) => {
  const colors = theme.colors;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.bg },
    header: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: (Typography.h1?.fontSize || 20),
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    scroll: { padding: Spacing.lg, gap: Spacing.sm },
    sectionLabel: {
      fontSize: (Typography.caption?.fontSize || 11),
      fontWeight: 'bold',
      color: colors.textSubtle,
      letterSpacing: 1.5,
      marginBottom: Spacing.sm,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    rowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    },
    rowText: { flex: 1, marginRight: Spacing.md },
    rowTitle: {
      fontSize: (Typography.bodySmall?.fontSize || 13),
      fontWeight: '600',
      color: theme.colors.text,
    },
    rowSubtitle: {
      fontSize: (Typography.caption?.fontSize || 11),
      color: colors.textSubtle,
      marginTop: 2,
    },
  });
}
