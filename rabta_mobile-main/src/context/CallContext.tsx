/**
 * Web app uses simple-peer + HTMLVideoElement. React Native would need react-native-webrtc.
 * This provider mirrors the web CallContext API so MainLayout can mount; call actions are no-ops on native.
 */
import React, { createContext, useContext, useRef, useState, type ReactNode } from "react";

export type CallType = "voice" | "video";

export interface GroupPeer {
  peerId: string;
  stream?: MediaStream;
}

interface CallContextType {
  stream?: MediaStream;
  myVideo: React.MutableRefObject<null>;
  userVideo: React.MutableRefObject<null>;
  callUser: (idToCall: string, name: string, type?: CallType, avatar?: string, chatId?: string) => void;
  answerCall: () => void;
  callGroup: (groupId: string, name: string, type?: CallType) => void;
  answerGroupCall: () => void;
  isGroupCall: boolean;
  groupPeers: GroupPeer[];
  leaveCall: () => void;
  receivingCall: boolean;
  callerName: string;
  callerAvatar: string;
  callType: CallType;
  callAccepted: boolean;
  callEnded: boolean;
  isCalling: boolean;
  calleeName: string;
  calleeAvatar: string;
  callDuration: number;
  isMinimized: boolean;
  toggleMinimize: () => void;
}

const CallContext = createContext<CallContextType | null>(null);

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within a CallProvider");
  return ctx;
};

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const myVideo = useRef(null);
  const userVideo = useRef(null);
  const [receivingCall] = useState(false);
  const [callerName] = useState("");
  const [callerAvatar] = useState("");
  const [callType] = useState<CallType>("video");
  const [callAccepted] = useState(false);
  const [callEnded] = useState(false);
  const [isCalling] = useState(false);
  const [calleeName] = useState("");
  const [calleeAvatar] = useState("");
  const [callDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isGroupCall] = useState(false);
  const [groupPeers] = useState<GroupPeer[]>([]);

  const noop = () => {};

  const value: CallContextType = {
    stream: undefined,
    myVideo,
    userVideo,
    callUser: noop,
    answerCall: noop,
    callGroup: noop,
    answerGroupCall: noop,
    isGroupCall,
    groupPeers,
    leaveCall: noop,
    receivingCall,
    callerName,
    callerAvatar,
    callType,
    callAccepted,
    callEnded,
    isCalling,
    calleeName,
    calleeAvatar,
    callDuration,
    isMinimized,
    toggleMinimize: () => setIsMinimized((p) => !p),
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};
