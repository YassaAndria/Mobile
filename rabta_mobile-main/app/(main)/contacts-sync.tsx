import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, Image, Alert, Share
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/ThemeContext';
import { spacing as Spacing, radius as Radius } from '../../src/theme/design-system';
import { typography as Typography } from '../../src/theme/typography';
import { useSyncContacts, RegisteredContact, UnregisteredContact } from '../../src/hooks/useSyncContacts';
import axiosInstance from '../../src/api/axiosInstance';
import { MaterialIcons } from '@expo/vector-icons';

export default function ContactsSyncScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const theme = { colors };
  
  const { syncContacts, loading, registeredContacts, unregisteredNumbers, hasSynced } = useSyncContacts();
  const [startingChat, setStartingChat] = useState<string | null>(null);
  
  // Section Toggle
  const [activeTab, setActiveTab] = useState<'onApp' | 'invite'>('onApp');

  useEffect(() => {
    // Automatically start syncing on mount
    syncContacts();
  }, [syncContacts]);

  const startChat = async (userId: string) => {
    setStartingChat(userId);
    try {
      const res = await axiosInstance.post('/chats', { userId });
      const chatId = res.data.data.chat._id;
      router.replace({ pathname: '/ChatWindowScreen', params: { chatId, chatName: '', isOnline: 'false', isGroup: 'false' } });
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to start chat');
    } finally { 
      setStartingChat(null); 
    }
  };

  const inviteContact = async (contact: UnregisteredContact) => {
    try {
      const dummyLink = "https://rabta.app/download-placeholder"; // TODO: Replace when app is published
      const message = `Hey! Join me on Rabta using this link: ${dummyLink}`;
      await Share.share({
        message,
        title: 'Join Rabta',
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    title: { fontSize: (Typography.h1?.fontSize || 20), fontWeight: '700', color: theme.colors.text },
    tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    tab: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center' },
    activeTab: { borderBottomWidth: 2, borderBottomColor: colors.purple },
    tabText: { fontWeight: '600', color: colors.textMuted },
    activeTabText: { color: colors.purple },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border + '50' },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.purple10, alignItems: 'center', justifyContent: 'center' },
    name: { fontSize: (Typography.bodySmall?.fontSize || 14), fontWeight: '600', color: theme.colors.text },
    phone: { fontSize: (Typography.caption?.fontSize || 12), color: colors.textMuted, marginTop: 2 },
    btn: { backgroundColor: colors.purple10, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
    btnText: { color: colors.purple, fontWeight: '600', fontSize: (Typography.bodySmall?.fontSize || 13) },
    inviteBtn: { backgroundColor: colors.textMuted + '20', borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
    inviteBtnText: { color: colors.text, fontWeight: '600', fontSize: (Typography.bodySmall?.fontSize || 13) },
  });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.purple} />
        </TouchableOpacity>
        <Text style={s.title}>Sync Contacts</Text>
      </View>

      {loading && !hasSynced ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.purple} size="large" />
          <Text style={{ color: colors.textMuted, marginTop: 12 }}>Syncing your contacts...</Text>
        </View>
      ) : (
        <>
          <View style={s.tabs}>
            <TouchableOpacity 
              style={[s.tab, activeTab === 'onApp' && s.activeTab]} 
              onPress={() => setActiveTab('onApp')}
            >
              <Text style={[s.tabText, activeTab === 'onApp' && s.activeTabText]}>
                On Rabta ({registeredContacts.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[s.tab, activeTab === 'invite' && s.activeTab]} 
              onPress={() => setActiveTab('invite')}
            >
              <Text style={[s.tabText, activeTab === 'invite' && s.activeTabText]}>
                Invite ({unregisteredNumbers.length})
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'onApp' ? (
            <FlatList
              data={registeredContacts}
              keyExtractor={u => u._id}
              renderItem={({ item }) => (
                <View style={s.row}>
                  {item.avatar
                    ? <Image source={{ uri: item.avatar }} style={s.avatar} />
                    : <View style={s.avatar}><Text style={{ color: colors.purple, fontWeight: '700', fontSize: 16 }}>{item.fullName[0]}</Text></View>
                  }
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>{item.fullName}</Text>
                    <Text style={s.phone}>{item.phoneNumber}</Text>
                  </View>
                  <TouchableOpacity style={s.btn} onPress={() => startChat(item._id)} disabled={startingChat === item._id}>
                    {startingChat === item._id ? <ActivityIndicator color={colors.purple} size="small" /> : <Text style={s.btnText}>Message</Text>}
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', marginTop: 32, color: colors.textMuted }}>
                  No contacts found on Rabta.
                </Text>
              }
            />
          ) : (
            <FlatList
              data={unregisteredNumbers}
              keyExtractor={(item, index) => `${item.standardizedNumber}-${index}`}
              renderItem={({ item }) => (
                <View style={s.row}>
                  <View style={s.avatar}>
                    <MaterialIcons name="person" size={24} color={colors.purple} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>{item.originalNumber}</Text>
                  </View>
                  <TouchableOpacity style={s.inviteBtn} onPress={() => inviteContact(item)}>
                    <Text style={s.inviteBtnText}>Invite</Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', marginTop: 32, color: colors.textMuted }}>
                  All your contacts are already on Rabta!
                </Text>
              }
            />
          )}
        </>
      )}
    </View>
  );
}
