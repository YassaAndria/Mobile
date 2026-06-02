import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/AppError';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client();

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

/**
 * Mobile Google Auth — accepts a Google ID token from Expo AuthSession,
 * verifies it via Google's tokeninfo endpoint, then finds/links the user
 * and returns a JWT. This avoids the broken server-side redirect flow on mobile.
 */
export const googleMobileAuth = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { idToken } = req.body;

  if (!idToken) {
    return next(new AppError('Google ID token is required', 400));
  }

  // Define allowed client IDs for verification
  const webClientId = process.env.GOOGLE_WEB_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const androidClientId = process.env.GOOGLE_ANDROID_CLIENT_ID;

  let payload;
  try {
    // Secure token verification using google-auth-library
    const ticket = await client.verifyIdToken({
      idToken,
      audience: [webClientId, androidClientId].filter(Boolean) as string[],
    });
    payload = ticket.getPayload();
  } catch (error) {
    return next(new AppError('Invalid Google token or verification failed', 401));
  }

  if (!payload) {
    return next(new AppError('Could not retrieve payload from Google', 401));
  }

  // Extract necessary details from payload
  const { email, name, picture, sub: googleId } = payload;

  if (!email) {
    return next(new AppError('Could not retrieve email from Google', 401));
  }

  // Database Logic: Find the user
  const { User } = require('../models/user');
  let user = await User.findOne({ email });

  if (!user) {
    // User does not exist, safely create and save a new user
    user = new User({
      email,
      fullName: name || 'Google User',
      googleId,
      avatar: picture,
      role: 'freelancer', // Defaulting role to freelancer
      profileComplete: false,
      isVerified: true, // Google accounts are implicitly email-verified
    });
    await user.save();
  } else {
    // If the user exists but hasn't linked their Google account yet
    if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }
  }

  // Session Management: Generate a secure custom JWT
  const token = authService.signToken(user._id.toString());
  const profileComplete = user.profileComplete;

  res.status(200).json({
    status: 'success',
    data: { user, token, profileComplete }
  });
});