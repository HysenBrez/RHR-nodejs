import moment from "moment";
import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";

import CarWash from "../models/CarWash.js";
import CarTransfer from "../models/CarTransfer.js";
import CheckInOut from "../models/CheckInOut.js";
import { addDays } from "../utils/helpers.js";

export const totalStats = async (req, res) => {
  const { from, to } = req.query;

  const today = moment({ h: 0, m: 0, s: 0 }).format();

  const queryObject = { createdAt: { $gte: new Date(today), $lte: addDays(today) } };

  if (from) queryObject.createdAt = { $gte: new Date(from) };

  if (to) queryObject.createdAt = { $lte: addDays(to) };

  if (from && to) queryObject.createdAt = { $gte: new Date(from), $lt: addDays(to) };

  const carWash = await CarWash.aggregate([
    { $match: { ...queryObject } },
    { $group: { _id: null, totalCount: { $sum: 1 }, totalPrice: { $sum: "$finalPrice" } } },
    { $project: { _id: 0, totalCount: 1, totalPrice: 1 } },
  ]);

  const carTransfer = await CarTransfer.aggregate([
    { $match: { ...queryObject } },
    {
      $group: { _id: null, totalCount: { $sum: 1 }, totalPrice: { $sum: "$finalPrice" } },
    },
    { $project: { _id: 0, totalCount: 1, totalPrice: 1 } },
  ]);

  const checkInOut = await CheckInOut.aggregate([
    { $match: { ...queryObject } },
    { $group: { _id: null, totalCheckIns: { $sum: 1 }, totalSalary: { $sum: "$dailySalary" } } },
    { $project: { _id: 0, totalCheckIns: 1, totalSalary: 1 } },
  ]);

  const totalStats = {
    carWash: {
      totalCount: carWash[0]?.totalCount || 0,
      totalPrice: carWash[0]?.totalPrice || 0,
    },
    carTransfer: {
      totalCount: carTransfer[0]?.totalCount || 0,
      totalPrice: carTransfer[0]?.totalPrice || 0,
    },
    checkInOut: {
      totalCheckIns: checkInOut[0]?.totalCheckIns || 0,
      totalCount: checkInOut[0]?.totalSalary || 0,
    },
  };

  res.status(StatusCodes.OK).json({ totalStats });
};
