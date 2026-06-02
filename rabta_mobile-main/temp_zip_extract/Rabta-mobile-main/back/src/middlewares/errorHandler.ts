import { Request, Response, NextFunction } from 'express';

// 1. مسار للتعامل مع الروابط الغلط (404 Not Found)
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`The link does not exist- ${req.originalUrl}`);
  res.status(404);
  next(error); 
};

// 2. المركز الرئيسي لمعالجة الأخطاء (Global Error Handler)
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // 👈 التعديل السحري هنا: بنسأله الأول، هل الإيرور جايب معاه statusCode؟ (زي بتاع AppError)
  let statusCode = err.statusCode || res.statusCode;
  
  // لو لسه 200 (يعني مفيش حد حدد كود)، نخليه 500 كخطأ سيرفر
  statusCode = statusCode === 200 ? 500 : statusCode;
  
  let message = err.message;

  // --- تحسين رسائل أخطاء قاعدة البيانات (MongoDB) ---
  
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message = 'The requested item was not found, please check the ID for accuracy.';
  }

  if (err.code === 11000) {
    statusCode = 400;
    message = 'These data (such as email or phone number) are already registered with us.';
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((val: any) => val.message).join(', ');
  }

  // --- تحسين رسائل أخطاء JWT ---
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again!';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your token has expired! Please log in again.';
  }

  // الرد النهائي
  res.status(statusCode).json({
    status: err.status || 'error', // ضفنا الـ status عشان تبقى ماشية مع AppError
    message: message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};