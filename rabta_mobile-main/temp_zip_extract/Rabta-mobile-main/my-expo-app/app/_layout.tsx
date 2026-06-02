import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Provider } from "react-redux";
import Toast from "react-native-toast-message";
import { ChatProvider } from "../src/context/ChatContext";
import { rehydrateAuth } from "../src/store/slices/authSlice";
import { store } from "../src/store/store";
import { ThemeProvider } from "../src/theme/ThemeContext";

function AuthHydrate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    (async () => {
      try {
        const [tokenEntry, userEntry] = await AsyncStorage.multiGet(["token", "user"]);
        const tokenValue = tokenEntry[1];
        const userValue = userEntry[1];

        if (tokenValue && userValue) {
          // ✅ نستخدم store.dispatch مباشرة - مش useDispatch - عشان نتجنب أي dependency تسبب loop
          store.dispatch(rehydrateAuth({ token: tokenValue, user: JSON.parse(userValue) }));
        }
      } catch {
        /* ignore */
      } finally {
        setReady(true);
      }
    })();
  }, []); // ✅ فاضية تماماً

  if (!ready) return null;
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <AuthHydrate>
          <ChatProvider>
            <Stack screenOptions={{ headerShown: false }} />
            <Toast />
          </ChatProvider>
        </AuthHydrate>
      </ThemeProvider>
    </Provider>
  );
}
