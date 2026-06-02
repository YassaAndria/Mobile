import { Request, Response } from 'express';
import Notification from '../models/Notification';
import { catchAsync } from '../utils/catchAsync';

export const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any)._id;
  const notifications = await Notification.find({ recipient: userId }).sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    data: { notifications }
  });
});

export const markAsRead = catchAsync(async (req: Request, res: Response) => {
  await Notification.updateMany(
    { recipient: (req.user as any)._id, read: false },
    { read: true }
  );

  res.status(200).json({
    status: 'success',
    message: 'All notifications marked as read'
  });
});
