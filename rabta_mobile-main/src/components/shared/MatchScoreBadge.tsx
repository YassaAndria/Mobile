import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';

interface MatchScoreBadgeProps {
  score?: number | null;
  reason?: string | null;
}

export const MatchScoreBadge: React.FC<MatchScoreBadgeProps> = ({ score, reason }) => {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  if (score === undefined || score === null) {
    return (
      <View style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MaterialIcons name="psychology" size={16} color={colors.textSubtle} />
        <Text style={[typography.caption, { color: colors.textSubtle, fontWeight: '700' }]}>
          AI Calculating...
        </Text>
      </View>
    );
  }

  // Determine colors and icon based on score
  let bgColor = `${colors.error}20`; // Light red
  let borderColor = `${colors.error}40`;
  let textColor = colors.error;
  let icon: keyof typeof MaterialIcons.glyphMap = "warning";

  if (score >= 80) {
    bgColor = `${colors.successText}20`; // Light green
    borderColor = `${colors.successText}40`;
    textColor = colors.successText;
    icon = "check-circle";
  } else if (score >= 50) {
    bgColor = `${colors.warning}20`; // Light orange (assuming colors.warning exists, else fallback to orange hex)
    borderColor = `${colors.warning}40`;
    textColor = colors.warning;
    icon = "info";
  }

  // Fallback if colors.warning isn't mapped in theme
  const safeBgColor = textColor === colors.warning && !colors.warning ? '#FFF3E0' : bgColor;
  const safeBorderColor = textColor === colors.warning && !colors.warning ? '#FFE0B2' : borderColor;
  const safeTextColor = textColor === colors.warning && !colors.warning ? '#F57C00' : textColor;

  return (
    <>
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => reason && setModalVisible(true)}
        style={[styles.badge, { backgroundColor: safeBgColor, borderColor: safeBorderColor }]}
      >
        <MaterialIcons name={icon} size={16} color={safeTextColor} />
        <Text style={[typography.caption, { color: safeTextColor, fontWeight: '900' }]}>
          {score}% Match
        </Text>
        {reason && (
          <MaterialIcons name="touch-app" size={14} color={safeTextColor} style={{ opacity: 0.6, marginLeft: 2 }} />
        )}
      </TouchableOpacity>

      {/* Bottom Sheet for Reason */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.bottomSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.handleBar} />
                <View style={styles.sheetHeader}>
                  <MaterialIcons name="psychology" size={24} color={colors.purple} />
                  <Text style={[typography.h3, { color: colors.text, marginLeft: 8 }]}>AI Match Analysis</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                    <MaterialIcons name="close" size={24} color={colors.textSubtle} />
                  </TouchableOpacity>
                </View>
                <Text style={[typography.body, { color: colors.text, lineHeight: 24, marginTop: 16 }]}>
                  {reason}
                </Text>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    alignSelf: 'flex-start',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#CCC',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeBtn: {
    marginLeft: 'auto',
    padding: 4,
  }
});
