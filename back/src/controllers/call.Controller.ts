import { Request, Response, NextFunction } from 'express';
import Call from '../models/Call';
import Community from '../models/Community';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/AppError';
import { generateToken04 } from '../utils/zegoTokenGenerator';

export const getUserCalls = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any)._id;

  const calls = await Call.find({
    $or: [{ caller: userId }, { receiver: userId }]
  })
  .populate('caller', 'fullName avatar jobTitle')
  .populate('receiver', 'fullName avatar jobTitle')
  .populate('communityId', 'name profileImage members')
  .populate('chatId', 'isGroup name')
  .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: { calls }
    });
  } catch (error: any) {
    console.error('GET CALL HISTORY ERROR:', error.message);
    console.error(error.stack);
    return next(new AppError('Internal Server Error fetching call history', 500));
  }
});

import { User } from '../models/user';
import { sendPushToUsers } from '../services/notification.service';

export const initiateCall = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { receiverId, communityId, type } = req.body;
  const callerId = (req.user as any)._id;

  if (!type) {
    return next(new AppError('Call type is required', 400));
  }

  if (type === 'group' && !communityId) {
    return next(new AppError('communityId is required for group calls', 400));
  }

  if (type !== 'group' && !receiverId) {
    return next(new AppError('receiverId is required for 1-on-1 calls', 400));
  }

  const call = await Call.create({
    caller: callerId,
    receiver: receiverId || undefined,
    communityId: communityId || undefined,
    type,
    status: 'missed'
  });

  // Fetch caller name to include in push notification
  const callerUser = await User.findById(callerId).select('fullName');
  const callerName = callerUser?.fullName || 'Someone';

  try {
    if (type !== 'group' && receiverId) {
      await sendPushToUsers([receiverId], {
        title: 'اتصال وارد',
        body: `يتصل بك ${callerName}`,
        data: { type: 'call', callId: call._id.toString(), callerId: callerId.toString() }
      });
    } else if (type === 'group' && communityId) {
      const community = await Community.findById(communityId).select('members name');
      if (community) {
        const memberIds = community.members
          .map(id => id.toString())
          .filter(id => id !== callerId.toString());
        await sendPushToUsers(memberIds, {
          title: `اتصال جماعي في ${community.name}`,
          body: `بدأ ${callerName} اتصالاً جماعياً`,
          data: { type: 'call', callId: call._id.toString(), communityId: communityId.toString() }
        });
      }
    }
  } catch (pushErr) {
    console.error('⚠️ Failed to dispatch call push notification:', pushErr);
  }

  res.status(201).json({
    status: 'success',
    data: { call }
  });
});

export const deleteCall = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const call = await Call.findById(id);

  if (!call) {
    return next(new AppError('No call found with that ID', 404));
  }

  await Call.findByIdAndDelete(id);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

export const getZegoToken = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req.user as any)._id?.toString() || req.body.userId;
  if (!userId) {
    return next(new AppError('User ID is required to generate a Zego token', 400));
  }

  const appId = Number(process.env.ZEGO_APP_ID || 661194692);
  const serverSecret = process.env.ZEGO_SERVER_SECRET || '0b9a59ed8d868d1a72cd3cc3920128f8';

  const effectiveTimeInSeconds = 3600;
  const payload = '';

  try {
    const token = generateToken04(appId, userId, serverSecret, effectiveTimeInSeconds, payload);
    res.status(200).json({
      status: 'success',
      data: {
        token,
        appId,
      }
    });
  } catch (error: any) {
    console.error('ZEGO TOKEN GENERATION ERROR:', error.message);
    return next(new AppError('Failed to generate Zego token: ' + (error.errorMessage || error.message), 500));
  }
});