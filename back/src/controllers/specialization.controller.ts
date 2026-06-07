import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../utils/catchAsync";
import Specialization from "../models/Specialization";
import { AppError } from "../utils/AppError";
import AdminLog from "../models/adminLog.model";

export const getAllSpecializations = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const specializations = await Specialization.find().sort({ createdAt: 1 });
  
  res.status(200).json({
    status: "success",
    data: { specializations },
  });
});

export const createSpecialization = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { name } = req.body;

  if (!name) {
    return next(new AppError("Please provide a specialization name", 400));
  }

  // Generate a clean lowercase value suitable for database/filtering (e.g. "Web Development" -> "web_development")
  const value = name.trim().toLowerCase().replace(/\s+/g, "_");

  const existing = await Specialization.findOne({ $or: [{ name }, { value }] });
  if (existing) {
    return next(new AppError("Specialization already exists", 400));
  }

  const specialization = await Specialization.create({
    name: name.trim(),
    value,
  });

  // تسجيل الحدث في الـ Admin Logs
  if (req.user) {
    const adminName = (req.user as any).fullName || 'Admin';
      
    await AdminLog.create({
      adminId: req.user._id,
      adminName: adminName,
      actionType: 'Create Specialization',
      targetName: specialization.name,
      category: 'Manual',
    });
  }

  res.status(201).json({
    status: "success",
    data: { specialization },
  });
});
