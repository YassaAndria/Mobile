import { configureStore, type Middleware } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import authReducer from "./slices/authSlice";
import postsReducer from "./slices/postsSlice";
import jobsReducer from "./slices/jobsSlice";

const authStorageMiddleware: Middleware = (storeAPI) => (next) => (action: any) => {
  const result = next(action);

  if (action.type === "auth/setCredentials") {
    try {
      AsyncStorage.setItem("token", action.payload.token);
      AsyncStorage.setItem("user", JSON.stringify(action.payload.user));
    } catch (e) {
      console.warn("Failed to save auth credentials to storage", e);
    }
  } else if (action.type === "auth/logout") {
    try {
      AsyncStorage.multiRemove(["token", "user"]);
    } catch (e) {
      console.warn("Failed to clear auth from storage", e);
    }
  } else if (action.type === "auth/updateProfile") {
    try {
      const state: any = storeAPI.getState();
      AsyncStorage.setItem("user", JSON.stringify(state.auth.user));
    } catch (e) {
      console.warn("Failed to update user profile in storage", e);
    }
  }

  return result;
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    posts: postsReducer,
    jobs: jobsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authStorageMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
