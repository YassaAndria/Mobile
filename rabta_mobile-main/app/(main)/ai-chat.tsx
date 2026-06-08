import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useTheme } from "../../src/theme/ThemeContext";
import axiosInstance from "../../src/api/axiosInstance";
import { useAudioRecorder, AudioModule, RecordingPresets } from "expo-audio";

type AiMessage = {
  id: string;
  text: string;
  sender: "user" | "ai";
};

export default function GlobalAiChatScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: "1",
      text: "Hello! I am your Rabta AI Guide. Ask me anything about project guidelines, platform rules, or details about communities and jobs! How can I help you today?",
      sender: "ai",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Scroll to bottom when keyboard opens so latest message stays visible
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => show.remove();
  }, []);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMsg: AiMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: "user",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    try {
      const res = await axiosInstance.post("/ai/ask-global", {
        question: userMsg.text,
      });

      if (res.data?.status === "success") {
        const aiMsg: AiMessage = {
          id: (Date.now() + 1).toString(),
          text: res.data.data,
          sender: "ai",
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (e: any) {
      console.error("[AiChat] error:", e);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: "Sorry, I am having trouble connecting right now. Please try again later.",
          sender: "ai",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = async () => {
    try {
      if (isRecording) {
        await audioRecorder.stop();
        setIsRecording(false);
        setIsTranscribing(true);
        const uri = audioRecorder.uri;
        if (!uri) return;
        const formData = new FormData();
        formData.append('audio', {
          uri,
          type: 'audio/m4a',
          name: 'voice.m4a',
        } as any);
        const res = await axiosInstance.post('/ai/voice/transcribe', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const transcribed = res.data?.data?.text || '';
        if (transcribed) setInputText(prev => prev + transcribed);
      } else {
        await AudioModule.requestRecordingPermissionsAsync();
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
        setIsRecording(true);
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Voice input failed' });
      setIsRecording(false);
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Rabta AI",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <MaterialIcons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text, fontWeight: "700" },
          headerShadowVisible: false,
        }}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 100}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const isUser = item.sender === "user";
            return (
              <View
                style={[
                  styles.messageRow,
                  isUser ? styles.messageRowUser : styles.messageRowAi,
                ]}
              >
                {!isUser && (
                  <View style={[styles.aiAvatar, { backgroundColor: colors.purple }]}>
                    <MaterialIcons name="auto-awesome" size={16} color="#fff" />
                  </View>
                )}
                <View
                  style={[
                    styles.bubble,
                    isUser
                      ? [styles.userBubble, { backgroundColor: colors.purple }]
                      : [styles.aiBubble, { backgroundColor: colors.surface2 }],
                  ]}
                >
                  <Text style={[styles.messageText, { color: isUser ? "#fff" : colors.text }]}>
                    {item.text}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.bg }]}
            placeholder="Ask anything..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: inputText.trim() ? colors.purple : colors.border }]}
            onPress={handleSend}
            disabled={!inputText.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="send" size={20} color={inputText.trim() ? "#fff" : colors.textMuted} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleVoiceInput}
            disabled={isTranscribing}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: isRecording ? '#EF4444' : colors.purple,
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 8,
            }}
          >
            {isTranscribing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons
                name={isRecording ? 'stop' : 'mic'}
                size={22}
                color="#fff"
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1 },
  backBtn: {
    marginLeft: Platform.OS === "ios" ? 0 : 8,
    marginRight: 16,
    padding: 4,
  },
  chatList: {
    padding: 16,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-end",
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  messageRowAi: {
    justifyContent: "flex-start",
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    alignItems: "flex-end",
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    marginRight: 12,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
});
