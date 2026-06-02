import axiosInstance from "./axiosInstance";

export const updateProfile = async (userData: any) => {
  const response = await axiosInstance.patch("/profile/me", userData);
  return response.data;
};

export const uploadAvatar = async (uri: string, name: string, type: string) => {
  const formData = new FormData();
  formData.append("avatar", { uri, name, type } as unknown as Blob);
  const response = await axiosInstance.patch("/profile/me/avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const getMyProfile = async () => {
  const response = await axiosInstance.get("/profile/me");
  return response.data;
};
