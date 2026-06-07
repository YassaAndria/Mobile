import Constants from "expo-constants";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { io, type Socket } from "socket.io-client";
import { Alert } from "react-native";
import type { RootState } from "../store/store";
import { logout } from "../store/slices/authSlice";

type ChatContextType = {
  socket: Socket | null;
  isConnected: boolean;
  sendMessage: (
    chatId: string,
    content: string,
    messageType?: string,
    attachments?: any[]
  ) => void;
};

const ChatContext = createContext<ChatContextType>({
  socket: null,
  isConnected: false,
  sendMessage: () => {},
});

export const useChat = () => useContext(ChatContext);

function getApiBase(): string {
  const configUrl = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;
  const url = (configUrl && configUrl !== "EXPO_PUBLIC_API_BASE_URL")
    ? configUrl
    : process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!url) console.warn("WARNING: EXPO_PUBLIC_API_BASE_URL is not set in .env");
  return url || "";
}

function getSocketUrl(): string {
  return getApiBase().replace(/\/$/, "").replace(/\/api\/v1$/, "");
}

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const token = useSelector((s: RootState) => s.auth.token);
  const dispatch = useDispatch();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const cleanupInProgress = useRef(false);

  useEffect(() => {
    if (!token) {
      // Logout case - cleanup socket but prevent cascading updates
      if (socket) {
        cleanupInProgress.current = true;
        try {
          socket.off("connect");
          socket.off("disconnect");
          socket.disconnect();
          setSocket(null);
          setIsConnected(false);
        } finally {
          cleanupInProgress.current = false;
        }
      }
      return;
    }

    // Login case - establish socket connection
    if (cleanupInProgress.current) {
      // Skip if cleanup is still in progress
      return;
    }

    const url = getSocketUrl();
    if (!url) {
      console.warn("Socket URL is empty. Aborting socket connection.");
      return;
    }

    const s = io(url, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    s.on("connect", () => setIsConnected(true));
    s.on("disconnect", () => setIsConnected(false));

    s.on("forceLogout", (data: any) => {
      Alert.alert(
        "Account Suspended",
        data?.reason || "You have been banned from using Rabta.",
        [
          {
            text: "OK",
            onPress: () => {
              dispatch(logout());
            }
          }
        ]
      );
    });

    s.on("banStatusUpdated", (data: any) => {
      if (data?.isBanned) {
        Alert.alert(
          "Account Suspended",
          data?.message || "Your account has been banned.",
          [
            {
              text: "OK",
              onPress: () => {
                dispatch(logout());
              }
            }
          ]
        );
      }
    });

    setSocket(s);

    return () => {
      try {
        s.off("connect");
        s.off("disconnect");
        s.off("forceLogout");
        s.off("banStatusUpdated");
        s.disconnect();
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  }, [token]);

  // ✅ useCallback مع [socket] عشان sendMessage متتغيرش كل render
  const sendMessage = useCallback(
    (
      chatId: string,
      content: string,
      messageType: string = "text",
      attachments: any[] = []
    ) => {
      if (!socket || !socket.connected) {
        console.warn("Socket is not connected");
        return;
      }
      socket.emit("send_message", { chatId, content, messageType, attachments });
    },
    [socket]
  );

  // ✅ useMemo صح مع كل الـ dependencies
  const value = useMemo(
    () => ({ socket, isConnected, sendMessage }),
    [socket, isConnected, sendMessage]
  );

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
