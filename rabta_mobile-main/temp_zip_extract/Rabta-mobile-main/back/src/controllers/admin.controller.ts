import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { User } from '../models/user';
import Job from '../models/Job';
import Chat from '../models/chat';
import Community from '../models/Community';
import { AppError } from '../utils/AppError';

// =======================
// Dashboard Stats
// =======================
export const getAdminStats = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const totalUsers = await User.countDocuments();
  const totalJobs = await Job.countDocuments();
  const totalGroups = await Community.countDocuments();

  res.status(200).json({
    status: 'success',
    data: {
      stats: {
        totalUsers,
        totalJobs,
        totalGroups
      }
    }
  });
});

// =======================
// Users Moderation
// =======================
export const getAllUsers = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const users = await User.find().select('-password');
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: { users }
  });
});

export const toggleBanUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  if (user.role === 'admin') {
    return next(new AppError('You cannot ban an admin', 400));
  }

  user.isBanned = !user.isBanned;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: `User has been successfully ${user.isBanned ? 'banned' : 'unbanned'}`,
    data: { user }
  });
});

// =======================
// Jobs Moderation
// =======================
export const getAllJobs = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const jobs = await Job.find().populate('publisherId', 'fullName email companyName');
  res.status(200).json({
    status: 'success',
    results: jobs.length,
    data: { jobs }
  });
});

export const deleteJob = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const job = await Job.findByIdAndDelete(req.params.id);
  if (!job) {
    return next(new AppError('Job not found', 404));
  }
  res.status(200).json({
    status: 'success',
    message: 'Job has been successfully deleted'
  });
});

// =======================
// Groups Moderation
// =======================
export const getAllGroups = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const groups = await Community.find().populate('owner', 'fullName email');
  
  // Transform to match the required fields: Name, Creator, Member Count
  const formattedGroups = groups.map((g: any) => ({
    _id: g._id,
    name: g.name,
    creator: g.owner ? { _id: g.owner._id, fullName: g.owner.fullName, email: g.owner.email } : null,
    memberCount: g.members ? g.members.length : 0,
    createdAt: g.createdAt
  }));

  res.status(200).json({
    status: 'success',
    results: formattedGroups.length,
    data: { groups: formattedGroups }
  });
});

export const deleteGroup = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const group = await Community.findByIdAndDelete(req.params.id);
  if (!group) {
    return next(new AppError('Group not found', 404));
  }
  
  // Optionally, you could also delete all messages related to this group
  // await Message.deleteMany({ chatId: group._id });

  res.status(200).json({
    status: 'success',
    message: 'Group has been successfully deleted'
  });
});
