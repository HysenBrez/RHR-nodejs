import moment from "moment";
import { StatusCodes } from "http-status-codes";

import Payroll from "../models/Payroll.js";
import { BadRequestError, NotFoundError } from "../errors/index.js";

export const checkPayroll = async (req, res) => {
  const { date } = req.query;

  //   const users = await
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
    !hourlyPay ||
    !hourlyPayGross ||
    !grossSalary ||
    !hourlyDeduction ||
    !monthlyDeduction ||
    !taxes
  )
    throw new BadRequestError("Please provide all values");

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
    taxes,
    createdBy: req.user.userId,
  });

  res.status(201).json({ payroll, msg: "Payroll created successfully." });
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
      $lte: new Date(addDays(to)),
    };
  if (from && to)
    queryObject.createdAt = {
      $gte: new Date(from),
      $lt: new Date(addDays(to)),
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
