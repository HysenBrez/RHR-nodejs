import moment from "moment";
import { StatusCodes } from "http-status-codes";

import Payroll from "../models/Payroll.js";
import User from "../models/User.js";
import { BadRequestError, NotFoundError } from "../errors/index.js";
import { addDays } from "../utils/helpers.js";

export const checkUsersForPayroll = async (req, res) => {
  const { date, role } = req.query;

  if (!date) throw new BadRequestError("Please provide all values");

  const getUsersIds = await Payroll.distinct("userId", { monthYear: date });

  const users = await User.find(
    {
      _id: { $nin: getUsersIds },
      role: role ? { $in: role.split(",") } : "user",
      active: true,
      deletedAt: null,
    },
    { active: 0, createdAt: 0, updatedAt: 0, __v: 0, resetToken: 0, description: 0 }
  );

  res.status(StatusCodes.OK).json({ users });
};

export const createPayroll = async (req, res) => {
  const {
    userId,
    employer,
    worker,
    monthYear,
    placeDate,
    canton,
    billingProcedure,
    totalHours,
    hourlyPay,
    holidayBonus,
    hourlyPayGross,
    grossSalary,
    hourlyDeduction,
    monthlyDeduction,
    monthlyPay,
    taxes,
  } = req.body;

  if (
    !userId ||
    !employer ||
    !worker ||
    !monthYear ||
    !placeDate ||
    !canton ||
    !totalHours ||
    hourlyPay == undefined ||
    hourlyPayGross == undefined ||
    !grossSalary ||
    hourlyDeduction == undefined ||
    monthlyDeduction == undefined ||
    monthlyPay == undefined ||
    !taxes
  )
    throw new BadRequestError("Please provide all values.");

  const payroll = await Payroll.create({
    userId,
    employer,
    worker,
    monthYear,
    placeDate,
    canton,
    billingProcedure,
    totalHours,
    hourlyPay,
    holidayBonus,
    hourlyPayGross,
    grossSalary,
    hourlyDeduction,
    monthlyDeduction,
    monthlyPay,
    taxes,
    createdBy: req.user.userId,
  });

  res.status(201).json({ payroll, msg: "Payroll created successfully." });
};

export const getPayroll = async (req, res) => {
  const { id } = req.params;

  if (!id) throw new BadRequestError("Please provide all values.");

  const payroll = await Payroll.findOne({ _id: id });

  if (!payroll) throw new NotFoundError("Not Found Payroll.");

  res.status(StatusCodes.OK).json({ payroll });
};

export const getPayrolls = async (req, res) => {
  const { userId, from, to } = req.query;

  const queryObject = {};

  if (userId) queryObject.userId = userId;

  if (from)
    queryObject.createdAt = {
      $gte: new Date(from),
    };
  if (to)
    queryObject.createdAt = {
      $lte: addDays(to),
    };
  if (from && to)
    queryObject.createdAt = {
      $gte: new Date(from),
      $lt: addDays(to),
    };

  let result = Payroll.find(queryObject);

  result = result.sort({ createdAt: -1 });

  const page = Number(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  result = result.skip(skip).limit(limit);

  const payrolls = await result;

  if (!payrolls) throw new NotFoundError("Not Found Payrolls.");

  const totalPayrolls = await Payroll.countDocuments(queryObject);
  const numOfPages = Math.ceil(totalPayrolls / limit);

  res.status(StatusCodes.OK).json({ payrolls, totalPayrolls, numOfPages });
};

export const deletePayroll = async (req, res) => {
  const { id } = req.params;

  const payroll = await Payroll.findOneAndDelete({ _id: id });

  if (!payroll) throw new BadRequestError("Not found payroll.");

  res.status(200).json({ msg: "Payroll has been deleted successfully." });
};
