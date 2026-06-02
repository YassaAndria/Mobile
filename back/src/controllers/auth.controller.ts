import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/AppError';
import jwt from 'jsonwebtoken';

export const login = catchAsync(async (req: Request, res: Response) => {
  const { user, token, profileComplete } = await authService.loginUser(req.body.email, req.body.password);
  res.status(200).json({ 
    status: 'success', 
    data: { user, token, profileComplete } 
  });
});

export const register = catchAsync(async (req: Request, res: Response) => {
  const { user, token } = await authService.registerUser(req.body);
  res.status(201).json({ 
    status: 'success', 
    data: { user, token } 
  });
});

export const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  await authService.forgotPassword(req.body.email);
  res.status(200).json({ 
    status: 'success', 
    message: 'Reset link sent to email' 
  });
});

export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { user, token } = await authService.resetPassword(req.params.token as string, req.body.password);
  res.status(200).json({ 
    status: 'success', 
    message: 'Password updated successfully',
    data: { user, token }
  });
});

export const googleAuthCallback = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return next(new AppError('Google login failed', 401));
  const user = req.user as any;
  const token = authService.signToken(user._id.toString());
  
  // We should also check profileComplete for Google users
  const profileComplete = user.profileComplete;
  
  // توجيه المستخدم للفرونت إند (React) مع التوكن وحالة البروفايل
  res.redirect(`${process.env.FRONTEND_URL}/login-success?token=${token}&profileComplete=${profileComplete}`);
});

import { User } from '../models/user';

export const googleMobileToken = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { idToken } = req.body;
  if (!idToken) {
    return next(new AppError('idToken is required', 400));
  }

  // 1. Verify idToken with Google tokeninfo endpoint
  let googleUser;
  try {
    const fetchFn = (global as any).fetch;
    if (!fetchFn) {
      return next(new AppError('Native fetch is not available in Node environment', 500));
    }
    const googleRes = await fetchFn(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!googleRes.ok) {
      const errData = await googleRes.json();
      return next(new AppError(errData.error_description || 'Invalid Google ID token', 400));
    }
    googleUser = await googleRes.json();
  } catch (err: any) {
    return next(new AppError('Failed to verify Google token: ' + err.message, 400));
  }

  const { email, sub: googleId } = googleUser;
  if (!email) {
    return next(new AppError('No email returned from Google', 400));
  }

  // 2. Find user by email
  let user = await User.findOne({ email });

  if (!user) {
    return next(new AppError('This account is not registered with us. Please create an account first.', 400));
  }

  // 3. Link Google ID if not already linked
  if (!user.googleId) {
    user.googleId = googleId;
    await user.save();
  }

  // 4. Issue JWT token
  const token = authService.signToken(user._id.toString());
  const profileComplete = user.profileComplete;

  res.status(200).json({
    status: 'success',
    data: {
      user,
      token,
      profileComplete,
    },
  });
});