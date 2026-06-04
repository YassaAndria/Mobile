console.log("[TRACE] 1. Layout module evaluation started");

/**
 * Root Layout — app/_layout.tsx
 *
 * Changes from original:
 *  - Wrapped the navigation tree with ZegoUIKitPrebuiltCallInvitationService
 *    so ZegoCloud can intercept incoming-call notifications from anywhere
 *    in the app without needing its own screen.
 *  - All existing providers (SafeAreaProvider, Redux, ThemeProvider,
 *    AuthHydrate, ChatProvider, Toast) are kept in the exact same order.
 *  - ZegoCloud is initialised ONLY when the user is authenticated
 *    (token + userId are available). Before that the gate renders nothing
 *    so we never try to init with empty credentials.
 */

// ── Patch MUST happen before any import that triggers a render ─────────────
import { SafeAreaProvider } from 'react-native-safe-area-context';

if (!(SafeAreaProvider as any).displayName) {
  (SafeAreaProvider as any).displayName = 'SafeAreaProvider';
}
// ──────────────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, ErrorBoundaryProps } from 'expo-router';
import { View, Text } from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Provider, useSelector } from 'react-redux';
import Toast from 'react-native-toast-message';
import Constants from 'expo-constants';
import { ChatProvider } from '../src/context/ChatContext';
import { rehydrateAuth } from '../src/store/slices/authSlice';
import { store } from '../src/store/store';
import type { RootState } from '../src/store/store';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { useInitialPermissions } from '../src/hooks/useInitialPermissions';

// ZegoCloud UIKit — call invitation service (handles incoming call UI/sound)
import ZegoUIKitPrebuiltCallService, {
  ZegoSendCallInvitationButton,
  ONE_ON_ONE_VIDEO_CALL_CONFIG,
  ONE_ON_ONE_VOICE_CALL_CONFIG,
  ZegoCallInvitationDialog,
} from '@zegocloud/zego-uikit-prebuilt-call-rn';
import ZIM, { ZIMConnectionState } from 'zego-zim-react-native';

const ZIMPlugin = {
  ZIMConnectionState,
  default: ZIM,
};

console.log("[TRACE] 3. All imports successful!");

// ─────────────────────────────────────────────────────────────────────────────
// Auth hydration guard (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────
function AuthHydrate({ children }: { children: React.ReactNode }) {
  console.log("[TRACE] 4. AuthHydrate rendered");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const didRun = useRef(false);

  // Request contacts permission on first app launch
  useInitialPermissions();

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    console.log("[TRACE] 5. AuthHydrate useEffect executing");

    (async () => {
      try {
        console.log("[TRACE] 6. Fetching token & user from AsyncStorage");
        const [tokenEntry, userEntry] = await AsyncStorage.multiGet(['token', 'user']);
        const tokenValue = tokenEntry[1];
        const userValue = userEntry[1];
        console.log(`[TRACE] 7. Storage fetched. Token exists: ${!!tokenValue}, User exists: ${!!userValue}`);

        if (tokenValue && userValue) {
          let parsedUser;
          try {
            parsedUser = JSON.parse(userValue);
            console.log("[TRACE] 8. Dispatching rehydrateAuth");
            store.dispatch(rehydrateAuth({ token: tokenValue, user: parsedUser }));
          } catch (parseErr) {
            console.error("Corrupt user storage:", parseErr);
            await AsyncStorage.multiRemove(['token', 'user']);
          }
        }
      } catch (err) {
        console.error("[TRACE] ❌ AuthHydration Failed:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        console.log("[TRACE] 9. AuthHydrate setting ready = true");
        setReady(true);
      }
    })();
  }, []);

  if (error) {
    throw error;
  }

  if (!ready) return null;
  return <>{children}</>;
}

// ─────────────────────────────────────────────────────────────────────────────
// ZegoCloud initialiser
// Reads the Zego AppID from Expo config (app.config.js / app.json extra).
// The server token is fetched per-call from the backend, NOT stored here.
// ─────────────────────────────────────────────────────────────────────────────
function ZegoCallProvider({ children }: { children: React.ReactNode }) {
  console.log("[TRACE] 10. ZegoCallProvider rendered");
  const user  = useSelector((s: RootState) => s.auth.user);
  const token = useSelector((s: RootState) => s.auth.token);
  const [isInitialized, setIsInitialized] = useState(false);
  const logoutInProgress = useRef(false);

  const rawZegoAppId = Constants.expoConfig?.extra?.zegoAppId as string | undefined;
  const zegoAppId = Number(
    (rawZegoAppId && rawZegoAppId !== "EXPO_PUBLIC_ZEGO_APP_ID")
      ? rawZegoAppId
      : (process.env.EXPO_PUBLIC_ZEGO_APP_ID || "0")
  );

  const hasValidAuth = !!user && !!token && !!zegoAppId && zegoAppId !== 0;
  const userIdStr = (user?._id || user?.id || '') as string;

  // Effect to handle initialization when user logs in
  useEffect(() => {
    if (!hasValidAuth || !userIdStr) {
      // User is not authenticated - skip init
      return;
    }

    // Already initialized - skip
    if (isInitialized) {
      return;
    }

    const userName = (user.fullName || user.name || 'User') as string;

    const zegoAppSign = process.env.EXPO_PUBLIC_ZEGO_APP_SIGN || '';

    ZegoUIKitPrebuiltCallService.init(
      zegoAppId,
      zegoAppSign,
      userIdStr,
      userName,
      [ZIMPlugin],
      {
        ringtoneConfig: {
          incomingCallFileName: 'zego_incoming.mp3',
          outgoingCallFileName: 'zego_outgoing.mp3',
        },
        requireConfig: async (data: any) => {
          return data.type === 1
            ? ONE_ON_ONE_VOICE_CALL_CONFIG
            : ONE_ON_ONE_VIDEO_CALL_CONFIG;
        },
      },
    )
      .then(() => {
        setIsInitialized(true);
        console.log('[ZEGO] Initialized successfully');
      })
      .catch((e: any) => {
        console.error('[ZEGO] Initialization failed:', e);
        setIsInitialized(false);
      });
  }, [hasValidAuth, userIdStr, zegoAppId, user?.fullName, user?.name, isInitialized]);

  // Separate effect to handle logout cleanup
  useEffect(() => {
    // Only uninit when we transition from authenticated to unauthenticated
    if (!hasValidAuth && isInitialized && !logoutInProgress.current) {
      logoutInProgress.current = true;
      try {
        ZegoUIKitPrebuiltCallService.uninit();
        setIsInitialized(false);
        console.log('[ZEGO] Uninitialized on logout');
      } catch (e) {
        console.warn('[ZEGO] Uninitialization warning:', e);
        setIsInitialized(false);
      } finally {
        logoutInProgress.current = false;
      }
    }
  }, [hasValidAuth, isInitialized]);

  return (
    <>
      {children}
      {/*
       * ZegoCallInvitationDialog renders the incoming-call overlay (ring tone,
       * accept / decline buttons) on top of any screen without navigation.
       * It MUST be a direct child of the provider tree, outside Stack/Navigator.
       */}
      {isInitialized && <ZegoCallInvitationDialog />}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root Layout
// ─────────────────────────────────────────────────────────────────────────────
export default function RootLayout() {
  console.log("[TRACE] 2. RootLayout rendered");
  return (
    /**
     * SafeAreaProvider MUST be the outermost wrapper so that:
     *  1. useSafeAreaInsets() works in every descendant screen.
     *  2. css-interop's maybeHijackSafeAreaProvider intercepts it here
     *     (where displayName is now guaranteed) instead of crashing inside
     *     a nested screen like ChatWindowScreen.
     */
    <SafeAreaProvider>
      <Provider store={store}>
        <ThemeProvider>
          <AuthHydrate>
            <ChatProvider>
              {/*
               * ZegoCallProvider wraps the navigation tree so that:
               *  - ZegoCloud is initialised after auth hydration (token ready).
               *  - ZegoCallInvitationDialog can overlay any screen.
               *  - The Stack navigator is untouched.
               */}
              <ZegoCallProvider>
                <Stack screenOptions={{ headerShown: false }} />
              </ZegoCallProvider>
              <Toast />
            </ChatProvider>
          </AuthHydrate>
        </ThemeProvider>
      </Provider>
    </SafeAreaProvider>
  );
}

export function ErrorBoundary({ error }: ErrorBoundaryProps) {
  console.error("[FATAL ERROR CAUGHT BY BOUNDARY]:", error);
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' }}>
      <Text style={{ color: 'red', fontWeight: 'bold' }}>CRASH LOG:</Text>
      <Text style={{ color: 'white', margin: 20 }}>{error.message}</Text>
    </View>
  );
}
