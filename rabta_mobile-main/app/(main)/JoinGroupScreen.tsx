import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeContext';
import { spacing as Spacing, radius as Radius } from '../../src/theme/design-system';
import { typography as Typography } from '../../src/theme/typography';
import { searchCommunities, joinCommunity } from '../../src/api/community';
import { getCommunityChatId, mapCommunityFromApi } from '../../src/utils/community';
import { normalizeId } from '../../src/utils/chatMessage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function JoinGroupScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ReturnType<typeof mapCommunityFromApi>[]>([]);
  const [searching, setSearching] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const [myId, setMyId] = useState('');

  React.useEffect(() => {
    AsyncStorage.getItem('user').then(s => {
      if (!s) return;
      const u = JSON.parse(s);
      setMyId(normalizeId(u._id ?? u.id));
    });
  }, []);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await searchCommunities(query.trim());
      const raw = res.data?.data?.communities ?? [];
      setResults(raw.map((c: Record<string, unknown>) => mapCommunityFromApi(c, myId)));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const join = async (item: ReturnType<typeof mapCommunityFromApi>) => {
    setJoining(item._id);
    try {
      const res = await joinCommunity(item._id);
      const requestSent = !!res.data?.data?.requestSent;
      if (requestSent) {
        Alert.alert(
          'Request sent',
          `Your request to join ${item.name} was sent. An admin will review it.`,
          [{ text: 'OK', onPress: () => router.back() }],
        );
        return;
      }
      Alert.alert('Success', `Joined ${item.name}!`, [
        {
          text: 'Open chat',
          onPress: () =>
            router.replace({
              pathname: '/ChatWindowScreen',
              params: {
                chatId: item.chatId,
                chatName: item.name,
                isGroup: 'true',
                communityId: item._id,
              },
            } as never),
        },
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert('Error', err?.response?.data?.message || 'Failed to join group');
    } finally {
      setJoining(null);
    }
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      padding: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: { fontSize: Typography.h1?.fontSize || 20, fontWeight: '700', color: colors.text },
    searchRow: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg },
    input: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      color: colors.text,
      fontSize: 15,
    },
    searchBtn: {
      backgroundColor: colors.purple,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.lg,
      justifyContent: 'center',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.lg,
      gap: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(249, 115, 22, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    name: { fontSize: Typography.bodySmall?.fontSize || 13, fontWeight: '600', color: colors.text },
    sub: { fontSize: Typography.caption?.fontSize || 11, color: colors.textMuted, marginTop: 2 },
    joinBtn: {
      backgroundColor: colors.purple10,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
    },
    joinText: { color: colors.purple, fontWeight: '600', fontSize: Typography.bodySmall?.fontSize || 13 },
  });

  return (
    <SafeAreaView style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={{ fontSize: 22, color: colors.purple }}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>Discover groups</Text>
      </View>
      <View style={s.searchRow}>
        <TextInput
          style={s.input}
          placeholder="Search by name, tag, category..."
          placeholderTextColor={colors.textSubtle}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          returnKeyType="search"
        />
        <TouchableOpacity style={s.searchBtn} onPress={search}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Search</Text>
        </TouchableOpacity>
      </View>
      {searching ? (
        <ActivityIndicator color={colors.purple} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={g => g._id}
          renderItem={({ item }) => {
            const chatId = getCommunityChatId(item);
            const alreadyMember = item.isMember;
            return (
              <View style={s.row}>
                <View style={s.avatar}>
                  <Text style={{ color: '#f97316', fontWeight: '700', fontSize: 18 }}>
                    {(item.name || 'G')[0]}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{item.name}</Text>
                  <Text style={s.sub} numberOfLines={2}>
                    {item.description || `${item.memberCount} members`}
                  </Text>
                </View>
                {alreadyMember ? (
                  <TouchableOpacity
                    style={s.joinBtn}
                    onPress={() =>
                      router.push({
                        pathname: '/ChatWindowScreen',
                        params: {
                          chatId,
                          chatName: item.name,
                          isGroup: 'true',
                          communityId: item._id,
                        },
                      } as never)
                    }
                  >
                    <Text style={s.joinText}>Open</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={s.joinBtn}
                    onPress={() => join(item)}
                    disabled={joining === item._id}
                  >
                    {joining === item._id ? (
                      <ActivityIndicator color={colors.purple} size="small" />
                    ) : (
                      <Text style={s.joinText}>Join</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 32, color: colors.textMuted }}>
              Search public groups to join
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}
