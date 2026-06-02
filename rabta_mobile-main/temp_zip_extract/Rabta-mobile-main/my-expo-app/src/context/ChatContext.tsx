import Constants from "expo-constants";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSelector } from "react-redux";
import { io, type Socket } from "socket.io-client";
import type { RootState } from "../store/store";

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
  const url =
    (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ||
    process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!url) console.warn("WARNING: EXPO_PUBLIC_API_BASE_URL is not set in .env");
  return url || "";
}

function getSocketUrl(): string {
  return getApiBase().replace(/\/$/, "").replace(/\/api\/v1$/, "");
}

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const token = useSelector((s: RootState) => s.auth.token);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const url = getSocketUrl();
    const s = io(url, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    s.on("connect", () => setIsConnected(true));
    s.on("disconnect", () => setIsConnected(false));

    setSocket(s);

    return () => {
      s.off("connect");
      s.off("disconnect");
      s.disconnect();
      setIsConnected(false);
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
