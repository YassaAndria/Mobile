import { User } from "../models/user";

export const AI_TOKEN_LIMIT = 20000;
const RESET_HOURS = 12;

export const checkAiLimit = async (userId: string, feature: keyof NonNullable<import("../models/user").IUser["tokenUsage"]>) => {
  if (feature === "appChatbot") return true; // unlimited

  const user = await User.findById(userId);
  if (!user) return false;

  const resetTime = user.aiLimitResets?.[feature as keyof typeof user.aiLimitResets];

  if (resetTime) {
    if (new Date() < new Date(resetTime)) {
      // Still in cooldown
      const remainingMs = new Date(resetTime).getTime() - new Date().getTime();
      const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
      throw new Error(`AI Feature Limit Reached: You have exhausted your tokens for this feature. It will reset in ${remainingHours} hours.`);
    } else {
      // Cooldown expired, reset the current usage and clear reset time
      await User.findByIdAndUpdate(userId, {
        $set: {
          [`aiCurrentWindowUsage.${feature}`]: 0,
          [`aiLimitResets.${feature}`]: null
        }
      });
      return true;
    }
  }

  // Check if somehow current window usage is > limit but reset time wasn't set
  const currentUsage = user.aiCurrentWindowUsage?.[feature as keyof typeof user.aiCurrentWindowUsage] || 0;
  if (currentUsage >= AI_TOKEN_LIMIT) {
    const newResetTime = new Date(Date.now() + RESET_HOURS * 60 * 60 * 1000);
    await User.findByIdAndUpdate(userId, {
      $set: {
        [`aiLimitResets.${feature}`]: newResetTime
      }
    });
    throw new Error(`AI Feature Limit Reached: You have exhausted your tokens for this feature. It will reset in 12 hours.`);
  }

  return true;
};

export const logTokenUsage = async (userId: string, feature: keyof NonNullable<import("../models/user").IUser["tokenUsage"]>, tokens: number) => {
  try {
    if (!userId || !feature || !tokens || tokens <= 0) return;

    const updateQuery: any = {
      $inc: {
        totalTokensUsed: tokens,
        [`tokenUsage.${feature}`]: tokens
      }
    };

    if (feature !== "appChatbot") {
      updateQuery.$inc[`aiCurrentWindowUsage.${feature}`] = tokens;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateQuery, { new: true });

    // Check if we just hit the limit
    if (feature !== "appChatbot" && updatedUser && updatedUser.aiCurrentWindowUsage) {
      const currentUsage = updatedUser.aiCurrentWindowUsage[feature as keyof typeof updatedUser.aiCurrentWindowUsage] || 0;
      if (currentUsage >= AI_TOKEN_LIMIT) {
        if (!updatedUser.aiLimitResets?.[feature as keyof typeof updatedUser.aiLimitResets]) {
          const newResetTime = new Date(Date.now() + RESET_HOURS * 60 * 60 * 1000);
          await User.findByIdAndUpdate(userId, {
            $set: {
              [`aiLimitResets.${feature}`]: newResetTime
            }
          });
        }
      }
    }

    console.log(`🪙 [Token Service] Added ${tokens} tokens to ${feature} for user ${userId}.`);
  } catch (error) {
    console.error("❌ [Token Service] Error logging token usage:", error);
  }
};