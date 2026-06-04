import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import type { MessageType } from '../../types';

const { width, height } = Dimensions.get('window');

interface StarredMessagesModalProps {
  visible: boolean;
  onClose: () => void;
  starredMessages: MessageType[];
}

export default function StarredMessagesModal({
  visible,
  onClose,
  starredMessages,
}: StarredMessagesModalProps) {
  const { colors, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF', borderBottomColor: isDark ? '#3A3A3C' : '#E5E5EA' }]}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.purple} />
            <Text style={[styles.backText, { color: colors.purple }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Starred Messages</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Message List */}
        <FlatList
          data={starredMessages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isMine = item.isMine;
            return (
              <View style={[styles.msgCard, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]}>
                <View style={styles.msgHeader}>
                  <Text style={[styles.senderName, { color: colors.purple }]}>
                    {isMine ? 'You' : item.senderName || 'Partner'}
                  </Text>
                  <Text style={[styles.msgTime, { color: colors.textMuted }]}>{item.time}</Text>
                </View>
                <Text style={[styles.msgContent, { color: colors.text }]}>
                  {item.type === 'text' ? item.content : `📎 [${item.type || 'Attachment'}]`}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="star-outline" size={64} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No starred messages in this chat.
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 60,
  },
  backText: {
    fontSize: 17,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  msgCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  msgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  senderName: {
    fontWeight: '700',
    fontSize: 13,
  },
  msgTime: {
    fontSize: 11,
  },
  msgContent: {
    fontSize: 15,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 15,
    marginTop: 16,
    textAlign: 'center',
  },
});
