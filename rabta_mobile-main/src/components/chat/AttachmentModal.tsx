import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

interface AttachmentModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLibrary: () => void;
  onSelectCamera: () => void;
  onSelectDocument: () => void;
  onSelectStt?: () => void;
}

export default function AttachmentModal({
  visible,
  onClose,
  onSelectLibrary,
  onSelectCamera,
  onSelectDocument,
  onSelectStt,
}: AttachmentModalProps) {
  const { colors, isDark } = useTheme();
  
  const options = [
    {
      id: 'library',
      icon: 'photo-library',
      label: 'Photo & Video Library',
      color: '#8b5cf6', // purple
      onPress: onSelectLibrary,
    },
    {
      id: 'camera',
      icon: 'camera-alt',
      label: 'Camera',
      color: '#ec4899', // pink
      onPress: onSelectCamera,
    },
    {
      id: 'document',
      icon: 'insert-drive-file',
      label: 'Document',
      color: '#3b82f6', // blue
      onPress: onSelectDocument,
    },
    ...(onSelectStt ? [{
      id: 'stt',
      icon: 'keyboard-voice',
      label: 'AI Speech-to-Text',
      color: '#a855f7', // purple-500
      onPress: onSelectStt,
    }] : []),
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { backgroundColor: isDark ? '#1e1e1e' : '#ffffff' }]}>
              {options.map((opt, index) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.optionRow,
                    index !== options.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? '#333' : '#eee' }
                  ]}
                  onPress={() => {
                    onClose();
                    opt.onPress();
                  }}
                >
                  <View style={[styles.iconBox, { backgroundColor: `${opt.color}15` }]}>
                    <MaterialIcons name={opt.icon as any} size={24} color={opt.color} />
                  </View>
                  <Text style={[styles.optionText, { color: colors.text }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    padding: 16,
    paddingBottom: 40, // extra space for bottom edge
  },
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
