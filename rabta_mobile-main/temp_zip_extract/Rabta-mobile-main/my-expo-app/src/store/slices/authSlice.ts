/* eslint-disable @typescript-eslint/no-explicit-any */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
  user: any | null;
  token: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: any; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      void AsyncStorage.setItem("token", action.payload.token);
      void AsyncStorage.setItem("user", JSON.stringify(action.payload.user));
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      void AsyncStorage.multiRemove(["token", "user"]);
    },
    updateProfile: (state, action: PayloadAction<any>) => {
      state.user = { ...state.user, ...action.payload };
      void AsyncStorage.setItem("user", JSON.stringify(state.user));
    },
    rehydrateAuth: (state, action: PayloadAction<{ user: any; token: string } | null>) => {
      if (action.payload?.token && action.payload?.user) {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      }
    },
  },
});

export const { setCredentials, logout, updateProfile, rehydrateAuth } = authSlice.actions;
export default authSlice.reducer;
