import { User } from "../models/user";

export const logTokenUsage = async (userId: string, feature: keyof NonNullable<import("../models/user").IUser["tokenUsage"]>, tokens: number) => {
  try {
    if (!userId || !feature || !tokens || tokens <= 0) return;

    // Build the dynamic update query
    const updateQuery: any = {
      $inc: {
        totalTokensUsed: tokens
      }
    };

    const featurePath = `tokenUsage.${feature}`;
    updateQuery.$inc[featurePath] = tokens;

    await User.findByIdAndUpdate(userId, updateQuery);
    console.log(`🪙 [Token Service] Added ${tokens} tokens to ${feature} for user ${userId}.`);
  } catch (error) {
    console.error("❌ [Token Service] Error logging token usage:", error);
  }
};