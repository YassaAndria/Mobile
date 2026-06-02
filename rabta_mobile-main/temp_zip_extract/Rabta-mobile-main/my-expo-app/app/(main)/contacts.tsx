import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../../src/api/axiosInstance';
import { useTheme } from '../../src/theme/ThemeContext';
import { spacing as Spacing } from '../../src/theme/design-system';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Contact {
  _id: string;
  fullName?: string;
  name?: string;
  username?: string;
  avatar?: string;
  profilePicture?: string | { image?: string };
  isOnline?: boolean;
  status?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDisplayName(c: Contact): string {
  return c.fullName ?? c.name ?? c.username ?? 'Unknown';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

function getAvatarUri(c: Contact): string | null {
  const raw =
    c.avatar ??
    (typeof c.profilePicture === 'string'
      ? c.profilePicture
      : c.profilePicture?.image) ??
    null;

  if (!raw) return null;
  if (raw.startsWith('http')) return raw;
  const base = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace('/api/v1', '');
  return `${base}${raw}`;
}

type ListItem = Contact;

// ── Component ─────────────────────────────────────────────────────────────────

export default function ContactsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch contacts ──────────────────────────────────────────────────────────

  const fetchContacts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      // ── Diagnostic: confirm baseURL and token before the call ────────────
      const token = await AsyncStorage.getItem('token');
      console.log('[Contacts] BASE_URL =', process.env.EXPO_PUBLIC_API_BASE_URL);
      console.log('[Contacts] Token present?', !!token);

      // Correct endpoint: GET /users/my-contacts  (NOT /users/contacts)
      const res = await axiosInstance.get('/users/my-contacts');

      console.log('[Contacts] Response status:', res.status);
      console.log('[Contacts] Response data:', JSON.stringify(res.data).slice(0, 300));

      // Backend returns: { data: { contacts: [...] } }
      const raw: Contact[] =
        res.data?.data?.contacts ??
        res.data?.data ??
        res.data?.contacts ??
        (Array.isArray(res.data) ? res.data : []);

      setContacts(Array.isArray(raw) ? raw : []);
    } catch (e: any) {
      // ── Full diagnostic dump ─────────────────────────────────────────────
      console.error('[Contacts] Fetch FAILED');
      console.error('  Status  :', e?.response?.status);
      console.error('  Message :', e?.response?.data?.message ?? e?.message);
      console.error('  Data    :', JSON.stringify(e?.response?.data));
      console.error('  URL     :', e?.config?.url);
      console.error('  Headers :', JSON.stringify(e?.config?.headers));

      const status = e?.response?.status;
      if (status === 401) {
        setError('Session expired. Please log in again.');
      } else if (status === 404) {
        setError('Contacts endpoint not found (404). Check backend route.');
      } else {
        setError('Could not load contacts. Pull down to retry.');
      }
      setContacts([]); // Explicitly set to empty array on error so app doesn't crash
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  // ── Navigation ──────────────────────────────────────────────────────────────

  const openChat = (contact: Contact) => {
    console.log('[Contacts] Opening chat with:', getDisplayName(contact), '| userId:', contact._id);
    router.push({
      pathname: '/ChatWindowScreen',
      params: {
        chatId: contact._id,         // resolves to chat on first message
        chatName: getDisplayName(contact),
        isGroup: 'false',
        isOnline: String(contact.isOnline ?? contact.status === 'online'),
        userId: contact._id,         // for profile navigation inside the chat
      },
    });
  };

  // ── Render helpers ──────────────────────────────────────────────────────────

  const barBg = isDark ? '#1e1e1e' : '#ffffff';

  const renderItem = ({ item }: { item: ListItem }) => {
    // ── CONTACT row ────────────────────────────────────────────────────────
    const name = getDisplayName(item);
    const avatarUri = getAvatarUri(item);
    const initials = getInitials(name);

    return (
      <TouchableOpacity
        style={[styles.row, { borderBottomColor: colors.border }]}
        activeOpacity={0.75}
        onPress={() => openChat(item)}
      >
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: colors.purple10 }]}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
          ) : (
            <Text style={[styles.initials, { color: colors.purple }]}>{initials}</Text>
          )}
          {/* Online dot */}
          {(item.isOnline || item.status === 'online') && (
            <View style={[styles.onlineDot, { borderColor: colors.surface }]} />
          )}
        </View>

        {/* Text */}
        <View style={styles.centerCol}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {name}
          </Text>
          {item.username && (
            <Text style={[styles.sub, { color: colors.textMuted }]} numberOfLines={1}>
              @{item.username}
            </Text>
          )}
        </View>

        <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.purple} />
      </TouchableOpacity>
    );
  };

  // Defensive: always give FlatList an array, even if state is somehow not one
  const listData: ListItem[] = Array.isArray(contacts) ? contacts : [];

  // ── Render Helpers ────────────────────────────────────────────────────────

  const renderHeader = () => (
    <>
      {/* ── Always-visible 'Add New Contact' button ────────────────────── */}
      <TouchableOpacity
        style={[styles.row, { borderBottomColor: colors.border }]}
        activeOpacity={0.75}
        onPress={() => router.push('/NewContact' as any)}
      >
        <View style={[styles.avatar, { backgroundColor: colors.purple10 }]}>
          <Ionicons name="person-add" size={24} color={colors.purple} />
        </View>
        <View style={styles.centerCol}>
          <Text style={[styles.name, { color: colors.purple }]}>New Contact</Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>
            Add a contact to Rabta
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {/* ── Contacts count ─────────────────────────────────────────────── */}
      {!loading && !error && contacts.length > 0 && (
        <View style={[styles.countBar, { backgroundColor: colors.bg }]}>
          <Text style={[styles.countText, { color: colors.textMuted }]}>
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </>
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.purple} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.errorText, { color: colors.textMuted }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.purple }]}
            onPress={() => fetchContacts()}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.centered}>
        <Ionicons name="people-outline" size={64} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.text }]}>
          No contacts yet
        </Text>
        <Text style={[styles.emptySub, { color: colors.textMuted }]}>
          Add people you know to start chatting
        </Text>
        <TouchableOpacity
          style={[styles.addFirstBtn, { backgroundColor: colors.purple }]}
          activeOpacity={0.85}
          onPress={() => router.push('/NewContact' as any)}
        >
          <Ionicons name="person-add-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.addFirstBtnText}>Add your first contact</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={26} color={colors.purple} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>Select Contact</Text>

        {/* Right placeholder to balance the back button */}
        <View style={{ width: 40 }} />
      </View>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <FlatList
        data={listData}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchContacts(true)}
            tintColor={colors.purple}
            colors={[colors.purple]}
          />
        }
      />
    </SafeAreaView>
  );
}

// ── Stylesheet ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4, width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', flex: 1 },

  // Count bar
  countBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  countText: { fontSize: 12, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },

  // List
  listContent: { paddingBottom: 40 },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },

  // Avatar
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  initials: { fontSize: 18, fontWeight: '700' },

  // Online dot
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#22c55e',
    borderWidth: 2,
  },

  // Text
  centerCol: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 13 },

  // Empty / error states
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
    marginTop: 60,
  },
  errorText: { fontSize: 14, textAlign: 'center' },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  emptySub: { fontSize: 13, textAlign: 'center' },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: '#fff', fontWeight: '700' },

  // Empty state CTA
  addFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  addFirstBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
