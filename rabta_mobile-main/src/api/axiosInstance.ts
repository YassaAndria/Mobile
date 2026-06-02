import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { store } from "../store/store";
import { logout } from "../store/slices/authSlice";
import Constants from "expo-constants";
import { router } from "expo-router";

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://192.168.1.3:5000/api/v1"; // Fallback if undefined

if (!process.env.EXPO_PUBLIC_API_BASE_URL) {
  console.error("ERROR: EXPO_PUBLIC_API_BASE_URL is not defined in the environment. Using fallback.");
}

const axiosInstance = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn("Failed to fetch token for request", e);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.log("[TRACE] Axios 401 Unauthorized intercepted.");
      await AsyncStorage.multiRemove(["token", "user"]);
      store.dispatch(logout());
      
      let retryCount = 0;
      const tryNavigate = () => {
        try {
          router.replace("/login");
        } catch (e) {
          if (retryCount < 5) {
            retryCount++;
            setTimeout(tryNavigate, 1000);
          } else {
            console.error("[TRACE] ❌ Router crash prevented:", e);
          }
        }
      };
      setTimeout(tryNavigate, 500);
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
