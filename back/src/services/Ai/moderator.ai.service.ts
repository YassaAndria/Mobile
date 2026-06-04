import mongoose from "mongoose";
import { User } from "../../models/user";
import Message from "../../models/Message";
import AdminLog from "../../models/adminLog.model";
import BannedContact from "../../models/BannedContact";
import { llm } from "./core.ai.service";
import { MODERATOR_AGENT_PROMPT } from "./prompts.ai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import sendEmail from "../../utils/sendEmail";

// In-memory lock to prevent race conditions when spamming messages rapidly
const moderationLocks = new Map<string, number>();

export const moderateMessage = async (message: any, io: any) => {
  if (!message.content || message.content.trim() === "") return;

  const senderId = message.senderId._id ? message.senderId._id : message.senderId;

  // 1. FLOODING CHECK (Algorithmic: >= 6 messages in 10 seconds)
  const tenSecondsAgo = new Date(Date.now() - 10000);
  const floodCount = await Message.countDocuments({
    senderId,
    createdAt: { $gte: tenSecondsAgo }
  });

  let aiResult;

  if (floodCount >= 6) {
    aiResult = {
      isViolation: true,
      type: "spam",
      reason: "إرسال عدد كبير جداً من الرسائل بسرعة فائقة (Flooding)."
    };
  } else {
    // 2. Fetch recent messages directly from DB for accurate time-based Spam detection (last 60 seconds)
    const sixtySecondsAgo = new Date(Date.now() - 60000);
    const recentMessagesDocs = await Message.find({
      senderId,
      _id: { $ne: message._id }, // Exclude current if already saved
      createdAt: { $gte: sixtySecondsAgo }
    }).sort({ createdAt: -1 });

    let recentMessagesContext = "No recent messages in the last 60 seconds.";
    if (recentMessagesDocs.length > 0) {
      recentMessagesContext = recentMessagesDocs
        .map((m, idx) => `[Message ${idx + 1}] -> ${m.content}`)
        .join("\n");
    }

  // 2. Evaluate with LLM
  const resolvedModel = await llm;
  const chain = MODERATOR_AGENT_PROMPT.pipe(resolvedModel).pipe(new StringOutputParser());

  let aiResultStr = "";
  try {
    aiResultStr = await chain.invoke({
      recentMessagesContext,
      currentMessage: message.content
    } as any);
  } catch (err) {
    console.error("LLM Moderator error:", err);
    return;
  }

    // Parse result
    try {
      // Clean backticks
      aiResultStr = aiResultStr.replace(/```json/g, "").replace(/```/g, "").trim();
      
      // Extract json if there is extraneous text
      const jsonMatch = aiResultStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[0]);
      } else {
        aiResult = JSON.parse(aiResultStr);
      }
    } catch (err) {
      console.error("Failed to parse Moderator LLM output:", aiResultStr);
      return;
    }
  }

  if (aiResult && aiResult.isViolation && aiResult.type !== "clean") {
    // IT IS A VIOLATION!
    const senderStr = senderId.toString();
    const now = Date.now();
    const lastLock = moderationLocks.get(senderStr);

    // If user was struck in the last 10 seconds, skip duplicate logging and emails
    if (lastLock && now - lastLock < 10000) {
      await Message.findByIdAndUpdate(message._id, {
        isAiDeleted: true,
        aiDeleteReason: aiResult.reason || `Violation: ${aiResult.type}`,
        isDeletedForEveryone: true
      });
      return;
    }

    // Set lock
    moderationLocks.set(senderStr, now);

    const user = await User.findById(senderId);
    if (!user) return;

    // Check if user is ALREADY currently banned
    if (user.banExpiresAt && user.banExpiresAt > new Date()) {
      await Message.findByIdAndUpdate(message._id, {
        isAiDeleted: true,
        aiDeleteReason: aiResult.reason || `Violation: ${aiResult.type}`,
        isDeletedForEveryone: true
      });
      return;
    }

    // Increment strike
    user.aiStrikes = (user.aiStrikes || 0) + 1;
    const strikes = user.aiStrikes;

    // Determine punishment
    let banDurationHours = 0;
    if (strikes === 1) banDurationHours = 24;
    else if (strikes === 2) banDurationHours = 72;
    
    if (strikes >= 3) {
      user.isBanned = true;
      user.banExpiresAt = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000); // 100 years
      
      // Add to BannedContact
      if (user.email || user.phoneNumber) {
        await BannedContact.create({
          email: user.email,
          phoneNumber: user.phoneNumber
        }).catch((err: any) => console.error("Duplicate banned contact:", err));
      }
    } else {
      user.banExpiresAt = new Date(Date.now() + banDurationHours * 60 * 60 * 1000);
    }
    
    await user.save({ validateBeforeSave: false });

    // Mark message as deleted
    await Message.findByIdAndUpdate(message._id, {
      isAiDeleted: true,
      aiDeleteReason: aiResult.reason || `Violation: ${aiResult.type}`,
      isDeletedForEveryone: true
    });

    // Create AdminLog
    await AdminLog.create({
      adminId: user._id, // System / AI
      adminName: "AI Moderator",
      actionType: strikes >= 3 ? "PERMANENT_BAN" : "TEMPORARY_BAN",
      targetName: user.email || user.fullName,
      targetUserId: user._id,
      category: "AI",
      aiReason: `Detected ${aiResult.type}. Reason: ${aiResult.reason}. Strike: ${strikes}`,
      relatedMessageContent: message.content
    });

    // Notify user via Email
    const emailSubject = strikes >= 3 ? "Rabta - Account Permanently Banned" : "Rabta - Warning & Temporary Ban";
    let emailHtml = "";
    if (strikes >= 3) {
      emailHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: red;">Account Permanently Banned</h2>
          <p>Your account has been permanently banned due to repeated violations of our community guidelines (${aiResult.type}).</p>
          <p>Please contact support if you believe this is a mistake.</p>
        </div>
      `;
    } else {
      emailHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: orange;">Warning: Temporary Ban</h2>
          <p>Your recent message violated our community guidelines (${aiResult.type}).</p>
          <p><strong>Reason:</strong> ${aiResult.reason}</p>
          <p>Your account has been temporarily banned from sending messages and applying to jobs for ${banDurationHours} hours.</p>
          <p>This is Strike ${strikes}/3. Further violations will result in a permanent ban.</p>
        </div>
      `;
    }

    sendEmail({
      email: user.email,
      subject: emailSubject,
      html: emailHtml
    }).catch((err: any) => console.error("Failed to send warning email:", err));

    // Emit Socket Events
    if (io) {
      // Notify chat that message is deleted
      io.to(message.chatId.toString()).emit("messageDeleted", {
        messageId: message._id,
        chatId: message.chatId,
        isAiDeleted: true,
        aiDeleteReason: aiResult.reason
      });

      if (strikes >= 3) {
        io.to(senderId.toString()).emit("forceLogout", { reason: "You have been permanently banned." });
      } else {
        io.to(senderId.toString()).emit("banStatusUpdated", {
          isBanned: true,
          banExpiresAt: user.banExpiresAt,
          message: `You are temporarily banned for ${banDurationHours} hours.`
        });
      }
    }
  }
};