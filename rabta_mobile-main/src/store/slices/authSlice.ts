/* eslint-disable @typescript-eslint/no-explicit-any */

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
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
    updateProfile: (state, action: PayloadAction<any>) => {
      state.user = { ...state.user, ...action.payload };
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
