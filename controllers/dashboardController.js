import moment from "moment";
import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";

import CarWash from "../models/CarWash.js";
import CarTransfer from "../models/CarWash.js";

export const totalStats = async (req, res) => {
  const { date } = req.query;

  const queryObject = {};

  const carWash = await CarWash.aggregate([
    { $match: { ...queryObject } },
    { $group: { _id: null, totalPrice: { $sum: "$finalPrice" } } },
    { $project: { _id: 0, totalPrice: 1 } },
  ]);

  const carTransfer = await CarTransfer.aggregate([
    { $match: { ...queryObject } },
    { $group: { _id: null, totalPrice: { $sum: "$finalPrice" } } },
    { $project: { _id: 0, totalPrice: 1 } },
  ]);

  res.status(StatusCodes.OK).json({
    carWash: carWash[0].totalPrice,
    carTransfer: carTransfer[0].totalPrice,
  });
};
