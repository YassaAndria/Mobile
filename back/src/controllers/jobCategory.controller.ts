import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../utils/catchAsync";
import JobCategory from "../models/JobCategory";
import { AppError } from "../utils/AppError";
import AdminLog from "../models/adminLog.model";

export const getAllJobCategories = catchAsync(async (req: Request, res: Response) => {
  const categories = await JobCategory.find().sort({ createdAt: 1 });
  res.status(200).json({
    status: "success",
    data: { categories },
  });
});

export const createJobCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { name } = req.body;

  if (!name) {
    return next(new AppError("Please provide a job category name", 400));
  }

  const value = name.trim().toLowerCase().replace(/\s+/g, "_");

  const existing = await JobCategory.findOne({ $or: [{ name }, { value }] });
  if (existing) {
    return next(new AppError("Job category already exists", 400));
  }

  const category = await JobCategory.create({
    name: name.trim(),
    value,
  });

  if (req.user) {
    const adminName = (req.user as any).fullName || 'Admin';
      
    await AdminLog.create({
      adminId: req.user._id,
      adminName: adminName,
      actionType: 'Create Job Category',
      targetName: category.name,
      category: 'Manual',
    });
  }

  res.status(201).json({
    status: "success",
    data: { category },
  });
});

export const deleteJobCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const category = await JobCategory.findById(id);
  if (!category) {
    return next(new AppError("Job category not found", 404));
  }

  await JobCategory.findByIdAndDelete(id);

  if (req.user) {
    const adminName = (req.user as any).fullName || 'Admin';
      
    await AdminLog.create({
      adminId: req.user._id,
      adminName: adminName,
      actionType: 'Delete Job Category',
      targetName: category.name,
      category: 'Manual',
    });
  }

  res.status(200).json({
    status: "success",
    message: "Job category deleted successfully",
  });
});
