// JoinGroupScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  SafeAreaView, StyleSheet, ActivityIndicator, Alert, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../src/store/hooks';
import axiosInstance from '../../src/api/axiosInstance';
import { useTheme } from '../../src/theme/ThemeContext';
import { spacing as Spacing, radius as Radius } from '../../src/theme/design-system';
import { typography as Typography } from '../../src/theme/typography';

export default function JoinGroupScreen() {
  const navigation = useNavigation<any>();
      const { colors, isDark } = useTheme();
  const theme = { colors };

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await axiosInstance.get('/chats/groups/search', { params: { keyword: query } });
      setResults(res.data.data.groups || []);
    } catch { setResults([]); }
    finally { setSearching(false); }
  };

  const join = async (groupId: string) => {
    setJoining(groupId);
    try {
      await axiosInstance.post(`/chats/group/${groupId}/join`);
      Alert.alert('Success', 'Joined group!');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to join group');
    } finally { setJoining(null); }
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    title: { fontSize: (Typography.h1?.fontSize || 20), fontWeight: '700', color: theme.colors.text },
    searchRow: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg },
    input: { flex: 1, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, color: theme.colors.text, fontSize: 15 },
    searchBtn: { backgroundColor: colors.purple, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, justifyContent: 'center' },
    row: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(249, 115, 22, 0.1)', alignItems: 'center', justifyContent: 'center' },
    name: { fontSize: (Typography.bodySmall?.fontSize || 13), fontWeight: '600', color: theme.colors.text },
    sub: { fontSize: (Typography.caption?.fontSize || 11), color: colors.textMuted, marginTop: 2 },
    joinBtn: { backgroundColor: colors.purple10, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
    joinText: { color: colors.purple, fontWeight: '600', fontSize: (Typography.bodySmall?.fontSize || 13) },
  });

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={{ fontSize: 22, color: colors.purple }}>←</Text></TouchableOpacity>
        <Text style={s.title}>Join a Group</Text>
      </View>
      <View style={s.searchRow}>
        <TextInput style={s.input} placeholder="Search groups by name..." placeholderTextColor={colors.textSubtle} value={query} onChangeText={setQuery} onSubmitEditing={search} returnKeyType="search" />
        <TouchableOpacity style={s.searchBtn} onPress={search}><Text style={{ color: '#fff', fontWeight: '600' }}>Search</Text></TouchableOpacity>
      </View>
      {searching ? (
        <ActivityIndicator color={colors.purple} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={g => g._id}
          renderItem={({ item }) => (
            <View style={s.row}>
              <View style={s.avatar}><Text style={{ color: '#f97316', fontWeight: '700', fontSize: 18 }}>{(item.groupName || 'G')[0]}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.groupName}</Text>
                <Text style={s.sub}>{item.users?.length || 0} members</Text>
              </View>
              <TouchableOpacity style={s.joinBtn} onPress={() => join(item._id)} disabled={joining === item._id}>
                {joining === item._id ? <ActivityIndicator color={colors.purple} size="small" /> : <Text style={s.joinText}>Join</Text>}
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 32, color: colors.textMuted }}>Search for a group to join</Text>}
        />
      )}
    </SafeAreaView>
  );
}
