import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "./axiosInstance";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: "freelancer" | "employer";
}

export interface AuthResponse {
  status: string;
  data: {
    user: {
      _id: string;
      fullName: string;
      email: string;
      phoneNumber: string;
      role: string;
      jobTitle?: string;
      bioHeadline?: string;
      profileComplete?: boolean;
    };
    token: string;
    profileComplete?: boolean;
  };
  message?: string;
}

export const loginUser = async (
  credentials: LoginCredentials,
): Promise<{ token: string; user: any; profileComplete: boolean }> => {
  const response = await axiosInstance.post<AuthResponse>("/auth/login", credentials);
  return {
    token: response.data.data.token,
    user: response.data.data.user,
    profileComplete: response.data.data.profileComplete ?? false,
  };
};

export const registerUser = async (
  userData: RegisterData,
): Promise<{ token: string; user: any }> => {
  const response = await axiosInstance.post<AuthResponse>("/auth/register", userData);
  return { token: response.data.data.token, user: response.data.data.user };
};

export const uploadProfilePicture = async (
  uri: string,
  name: string,
  type: string,
): Promise<{ status: string; avatar: string }> => {
  const formData = new FormData();
  formData.append("avatar", { uri, name, type } as unknown as Blob);
  const response = await axiosInstance.patch("/profile/me/avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return { status: response.data.status, avatar: response.data.data.user.avatar };
};

export const logoutUser = async (): Promise<void> => {
  await AsyncStorage.multiRemove(["token", "user"]);
};
