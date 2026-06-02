import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  SafeAreaView, StyleSheet, ActivityIndicator, Image, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../src/store/hooks';
import axiosInstance from '../../src/api/axiosInstance';
import { useTheme } from '../../src/theme/ThemeContext';
import { spacing as Spacing, radius as Radius } from '../../src/theme/design-system';
import { typography as Typography } from '../../src/theme/typography';

export default function NewContactScreen() {
  const navigation = useNavigation<any>();
      const { colors, isDark } = useTheme();
  const theme = { colors };

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get('/users/search/all', { params: { keyword: query.trim() } });
        setResults(res.data.data.users || []);
      } finally { setLoading(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [query]);

  const startChat = async (userId: string) => {
    setStarting(userId);
    try {
      const res = await axiosInstance.post('/chats', { userId });
      const chatId = res.data.data.chat._id;
      navigation.replace('ChatWindow', { chatId, chatName: '', isOnline: false, isGroup: false });
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to start chat');
    } finally { setStarting(null); }
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    title: { fontSize: (Typography.h1?.fontSize || 20), fontWeight: '700', color: theme.colors.text },
    searchWrap: { padding: Spacing.lg },
    input: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, color: theme.colors.text, fontSize: 15 },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.purple10, alignItems: 'center', justifyContent: 'center' },
    name: { fontSize: (Typography.bodySmall?.fontSize || 13), fontWeight: '600', color: theme.colors.text },
    email: { fontSize: (Typography.caption?.fontSize || 11), color: colors.textMuted, marginTop: 2 },
    msgBtn: { backgroundColor: colors.purple10, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
    msgText: { color: colors.purple, fontWeight: '600', fontSize: (Typography.bodySmall?.fontSize || 13) },
  });

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={{ fontSize: 22, color: colors.purple }}>←</Text></TouchableOpacity>
        <Text style={s.title}>New Contact</Text>
      </View>
      <View style={s.searchWrap}>
        <TextInput
          style={s.input}
          placeholder="Search by name or email..."
          placeholderTextColor={colors.textSubtle}
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
      </View>
      {loading ? (
        <ActivityIndicator color={colors.purple} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={u => u._id}
          renderItem={({ item }) => (
            <View style={s.row}>
              {item.avatar
                ? <Image source={{ uri: item.avatar }} style={s.avatar} />
                : <View style={s.avatar}><Text style={{ color: colors.purple, fontWeight: '700', fontSize: 16 }}>{item.fullName[0]}</Text></View>
              }
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.fullName}</Text>
                <Text style={s.email}>{item.email}</Text>
              </View>
              <TouchableOpacity style={s.msgBtn} onPress={() => startChat(item._id)} disabled={starting === item._id}>
                {starting === item._id ? <ActivityIndicator color={colors.purple} size="small" /> : <Text style={s.msgText}>Message</Text>}
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 32, color: colors.textMuted }}>
              {query.trim() ? 'No users found' : 'Type to search users...'}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}
