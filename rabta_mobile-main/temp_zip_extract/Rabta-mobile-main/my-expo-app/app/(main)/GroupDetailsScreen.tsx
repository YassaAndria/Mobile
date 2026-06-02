// GroupDetailsScreen.tsx
import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppSelector } from '../../src/store/hooks';
import { useTheme } from '../../src/theme/ThemeContext';
import { spacing as Spacing, radius as Radius } from '../../src/theme/design-system';
import { typography as Typography } from '../../src/theme/typography';

export default function GroupDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
    const theme = getTheme(themeMode === 'dark');
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 22, color: colors.purple }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Group Details</Text>
      </View>
      <View style={styles.center}>
        <Text style={{ color: colors.textMuted }}>Group ID: {route.params?.groupId}</Text>
        <Text style={{ color: colors.textSubtle, marginTop: 8, fontSize: 12 }}>Full group details screen — extend from GroupDetails.tsx logic</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: (Typography.h1?.fontSize || 20), fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['2xl'] },
});
