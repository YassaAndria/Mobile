import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../utils/catchAsync";
import JobCategory from "../models/JobCategory";

export const getAllJobCategories = catchAsync(async (req: Request, res: Response) => {
  const categories = await JobCategory.find().sort({ createdAt: 1 });
  res.status(200).json({
    status: "success",
    data: { categories },
  });
});
