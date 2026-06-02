import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import { useTheme } from "../../theme/ThemeContext";

/** Derives two-letter initials from a full name. Returns empty string if name is absent. */
function deriveInitials(fullName: string | undefined | null): string {
  if (!fullName || !fullName.trim()) return "";
  const parts = fullName.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

const TopHeader: React.FC = () => {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const user = useSelector((state: RootState) => state.auth.user);

  const profileImage: string | null = useMemo(
    () => user?.avatar || user?.profilePicture || user?.image || null,
    [user]
  );

  const initials = useMemo(() => deriveInitials(user?.fullName), [user?.fullName]);

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Profile avatar tap → navigates to Profile screen */}
      <Pressable
        onPress={() => router.push("/profile")}
        accessibilityLabel="Open profile"
        style={styles.avatarBtn}
      >
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: colors.purple,
              borderColor: isDark ? "#6D28D9" : "#DDD6FE",
            },
          ]}
        >
          {profileImage ? (
            <Image
              source={{ uri: profileImage }}
              style={styles.avatarImg}
              contentFit="cover"
            />
          ) : (
            // Falls back to initials derived from the real user.fullName in Redux
            <Text style={styles.avatarInitials}>{initials}</Text>
          )}
        </View>
      </Pressable>
      </View>
    </View>
  );
};

export default TopHeader;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,

  },
  avatarBtn: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  avatarInitials: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
});
