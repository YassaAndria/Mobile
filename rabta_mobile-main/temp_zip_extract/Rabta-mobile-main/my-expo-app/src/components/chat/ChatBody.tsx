import React, { useRef, useEffect } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import type { MessageType } from '../../types';

interface ChatBodyProps {
  messages?: MessageType[];
  loading?: boolean;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

const isSameDay = (d1: Date, d2: Date) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

const getDateLabel = (dateStr: string): string => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

// ── Types ─────────────────────────────────────────────────────────────────────

type SeparatorItem = { isSeparator: true; id: string; text: string };
type BubbleItem = MessageType & { isFirstInGroup: boolean };
type RenderItem = BubbleItem | SeparatorItem;

// ── Main Component ────────────────────────────────────────────────────────────

export default function ChatBody({ messages = [], loading }: ChatBodyProps) {
  const { colors, isDark } = useTheme();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages]);

  // ── Build render list with date separators + group metadata ────────────────
  const renderData: RenderItem[] = [];
  let lastDate: Date | null = null;
  let lastIsMine: boolean | null = null;

  messages.forEach((msg) => {
    let separatorInserted = false;

    if (msg.createdAt) {
      const msgDate = new Date(msg.createdAt);
      if (!lastDate || !isSameDay(lastDate, msgDate)) {
        renderData.push({
          isSeparator: true,
          id: `sep-${msg.createdAt}-${msg.id}`,
          text: getDateLabel(msg.createdAt),
        });
        lastDate = msgDate;
        separatorInserted = true;
      }
    }

    const isFirstInGroup =
      separatorInserted || lastIsMine === null || lastIsMine !== msg.isMine;
    lastIsMine = msg.isMine;

    renderData.push({ ...msg, isFirstInGroup });
  });

  // ── Render: Date Separator ─────────────────────────────────────────────────
  const renderSeparator = (item: SeparatorItem) => (
    <View style={{ alignItems: 'center', marginVertical: 12 }}>
      <View
        style={{
          backgroundColor: isDark ? '#2a2a2a' : colors.surface,
          paddingHorizontal: 12,
          paddingVertical: 3,
          borderRadius: 20,
        }}
      >
        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '500' }}>
          {item.text}
        </Text>
      </View>
    </View>
  );

  // ── Render: Message Bubble ─────────────────────────────────────────────────
  const renderBubble = (item: BubbleItem) => {
    const isMine = item.isMine;
    const topMargin = item.isFirstInGroup ? 16 : 4;

    const bubbleBg = isMine
      ? colors.purple
      : isDark
      ? '#1e1e1e'
      : colors.surface;

    return (
      /**
       * Outer row: full-width so align-self on the bubble works correctly.
       * We do NOT use justifyContent here — align-self drives the position.
       */
      <View
        style={{
          width: '100%',
          paddingHorizontal: 16,
          marginTop: topMargin,
        }}
      >
        {/* Bubble */}
        <View
          style={{
            alignSelf: isMine ? 'flex-end' : 'flex-start',
            maxWidth: '80%',
            minWidth: 100,
            backgroundColor: bubbleBg,
            borderRadius: 18,
            borderTopRightRadius: isMine ? 4 : 18,
            borderTopLeftRadius: isMine ? 18 : 4,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          {/* Message text — flex-shrink:1 ensures correct wrapping */}
          <Text
            style={{
              color: isMine ? '#ffffff' : colors.text,
              fontSize: 15,
              lineHeight: 21,
              flexShrink: 1,
            }}
          >
            {item.content ?? ''}
          </Text>

          {/*
           * Timestamp row — NOT absolute.
           * flex-direction:'row' + align-self:'flex-end' keeps it right-aligned
           * and adds natural height to the bubble (no overlap).
           */}
          <View
            style={{
              flexDirection: 'row',
              alignSelf: 'flex-end',
              alignItems: 'center',
              marginTop: 4,
              gap: 3,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                color: isMine ? 'rgba(255,255,255,0.65)' : colors.textMuted,
              }}
            >
              {item.time ?? ''}
            </Text>
            {isMine && (
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>
                ✓✓
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderItem = ({ item }: { item: RenderItem }) => {
    if ((item as SeparatorItem).isSeparator) {
      return renderSeparator(item as SeparatorItem);
    }
    return renderBubble(item as BubbleItem);
  };

  if (loading && messages.length === 0) return null;

  return (
    <FlatList
      ref={flatListRef}
      data={renderData}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={{ paddingTop: 8, paddingBottom: 8 }}
      showsVerticalScrollIndicator={false}
      onContentSizeChange={() =>
        flatListRef.current?.scrollToEnd({ animated: true })
      }
      onLayout={() =>
        flatListRef.current?.scrollToEnd({ animated: false })
      }
      keyboardShouldPersistTaps="handled"
    />
  );
}
