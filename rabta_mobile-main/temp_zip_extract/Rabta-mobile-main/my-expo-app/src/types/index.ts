// ==========================================
// 1. User & Auth Interfaces
// ==========================================

export type UserRole = 'student' | 'freelancer' | 'employer';
export type UserStatus = 'Online' | 'Offline';

export interface User {
  _id: string;
  id?: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: UserRole;
  track_name?: string;
  skills?: string[];
  portfolio_links?: string[];
  company_name?: string;
  status?: UserStatus;
  bio?: string;
  avatar?: string;
  profilePicture?: string;
  image?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  profileComplete?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: 'freelancer' | 'employer';
}

// ==========================================
// 2. Chat & Message Interfaces
// ==========================================

export interface ChatItem {
  _id: string;
  id?: string;
  name: string;
  receiverId?: string;
  lastMessage: string;
  time: string;
  avatar?: string;
  initials?: string;
  isOnline?: boolean;
  isGroup?: boolean;
  unreadCount?: number;
}

export interface MessageType {
  id: string;
  type: 'text' | 'file';
  content: string;
  time: string;
  createdAt?: string;
  isMine: boolean;
}

export interface Attachment {
  file_url: string;
  file_type: string;
}

export interface Message {
  _id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'code_snippet' | 'image' | 'file';
  attachments?: Attachment[];
  read_by?: string[];
  created_at: string;
}

// ==========================================
// 3. Call Interfaces
// ==========================================

export interface CallRecord {
  _id: string;
  caller: User;
  receiver?: User;
  receiverModel?: 'User' | 'Group';
  chatId?: any;
  type: 'voice' | 'video';
  status: 'missed' | 'accepted' | 'ended' | 'rejected';
  duration?: number;
  createdAt: string;
}

// ==========================================
// 4. Group Interfaces
// ==========================================

export interface Group {
  _id: string;
  groupName: string;
  description?: string;
  avatar?: string;
  users?: User[];
  admins?: string[];
  isGroup: true;
}

// ==========================================
// 5. Redux Store Types
// ==========================================

export interface RootState {
  auth: AuthState;
  ui: UIState;
  theme: ThemeState;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface UIState {
  sidebarOpen: boolean;
}

export interface ThemeState {
  mode: 'light' | 'dark';
}
