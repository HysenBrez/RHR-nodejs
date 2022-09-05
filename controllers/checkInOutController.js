import CheckInOut from "../models/CheckInOut.js";
import moment from "moment";
import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";

import { BadRequestError, NotFoundError } from "../errors/index.js";
import checkPermissions from "../utils/checkPermissions.js";

export const checkForDate = async (req, res) => {
  const { id: userId } = req.params;

  if (!userId) {
    throw new BadRequestError("Please provide all values");
  }

  const check = await CheckInOut.aggregate([
    {
      $addFields: {
        onlyDate: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$startTime",
          },
        },
      },
    },
    {
      $match: {
        onlyDate: {
          $eq: moment().format("YYYY-MM-DD"),
        },
        userId: mongoose.Types.ObjectId(userId),
      },
    },
    {
      $project: {
        _id: 0,
        startTime: 1,
        endTime: 1,
        active: 1,
        attempt: 1,
        description: 1,
      },
    },
  ]);

  if (check.length === 0) {
    res.status(200).json({ active: false, attempt: 0 });
  } else {
    res.status(200).json(check[0]);
  }
};

export const checkIn = async (req, res) => {
  const { userId, startTime, startTimeLocation } = req.body;

  if (!userId || !startTime) {
    throw new BadRequestError("Please provide all values");
  }

  const checkData = await CheckInOut.findOne({ userId, startTime });
  if (checkData) {
    throw new BadRequestError(
      "You can't create check-in twice for the same day."
    );
  }

  const checkIn = await CheckInOut.create({
    userId,
    startTime,
    active: true,
    attempt: 1,
    startTimeLocation,
    createdBy: req.user.userId,
  });

  res.status(201).json(checkIn);
};

export const checkOut = async (req, res) => {
  const { userId, startTime, endTime, endTimeLocation } = req.body;

  if (!userId || !startTime) {
    throw new BadRequestError("Please provide all values");
  }

  const checkIn = await CheckInOut.findOne({ userId, startTime });

  if (!checkIn) {
    throw new NotFoundError("Not found check-in");
  }

  const diff = moment(endTime).diff(moment(startTime), "minutes");
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  const salaryForHours = 10;

  checkIn.endTime = endTime;
  checkIn.endTimeLocation = endTimeLocation;
  checkIn.active = false;
  checkIn.hours = `${hours}h ${minutes}min`;
  checkIn.dailySalary = (
    hours * salaryForHours +
    (minutes * salaryForHours) / 60
  ).toFixed(2);

  await checkIn.save();

  res.status(200).json(checkIn);
};

export const getCheckInsByUser = async (req, res) => {
  const { id: userId } = req.params;

  const { from, to } = req.query;

  const queryObject = {};

  if (!userId) {
    throw new BadRequestError("Please provide all values");
  }

  if (from)
    queryObject.startTime = {
      $gte: new Date(from),
    };
  if (to)
    queryObject.startTime = {
      $lte: new Date(to), // should be +1 day
    };
  if (from && to)
    queryObject.startTime = {
      $gte: new Date(from),
      $lt: new Date(to),
    };

  let result = CheckInOut.find(queryObject);

  result = result.sort({ createdAt: -1 });

  const page = Number(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  result = result.skip(skip).limit(limit);

  const checkIns = await result;

  if (!checkIns) {
    throw new NotFoundError("Not found checkIns");
  }

  const totalCheckIns = await CheckInOut.countDocuments(queryObject);
  const numOfPages = Math.ceil(totalCheckIns / limit);

  res.status(StatusCodes.OK).json({ checkIns, totalCheckIns, numOfPages });
};

export const checkInDescription = async (req, res) => {
  const { userId, startTime, description } = req.body;

  if (!userId || !startTime || !description) {
    throw new BadRequestError("Please provide all values");
  }

  const checkIn = await CheckInOut.findOne({ userId, startTime });

  if (!checkIn) {
    throw new NotFoundError("Not found check-in");
  }

  checkIn.description = description;

  await checkIn.save();

  res.status(200).json({
    msg: "Description successfully updated",
    description: checkIn.description,
  });
};

export const getCheckIn = async (req, res) => {
  const { id } = req.params;

  const checkIn = await CheckInOut.findOne({ _id: id }).populate("userId", [
    "_id",
    "firstName",
    "lastName",
  ]);

  if (!checkIn) {
    throw new NotFoundError(`Not found check-in`);
  }

  res.status(200).json(checkIn);
};

export const checkInByAdmin = async (req, res) => {
  checkPermissions(req.user);

  const { userId, startTime, endTime, description } = req.body;

  if (!userId || !startTime || !endTime || !description) {
    throw new BadRequestError("Please provide all values");
  }

  const checkData = await CheckInOut.findOne({ userId, startTime });
  if (checkData) {
    throw new BadRequestError(
      "You can't create check-in twice for the same day."
    );
  }

  const checkIn = await CheckInOut.create({
    userId,
    startTime,
    endTime,
    active: false,
    attempt: 1,
    description,
    createdBy: req.user.userId,
  });

  res.status(201).json(checkIn);
};

export const getAllCheckIns = async (req, res) => {
  checkPermissions(req.user);

  const { userId, from, to } = req.query;

  const queryObject = {};

  if (userId) queryObject.userId = userId;
  if (from)
    queryObject.startTime = {
      $gte: new Date(from),
    };
  if (to)
    queryObject.startTime = {
      $lte: new Date(to), // should be +1 day
    };
  if (from && to)
    queryObject.startTime = {
      $gte: new Date(from),
      $lt: new Date(to),
    };

  let result = CheckInOut.find(queryObject).populate("userId", [
    "_id",
    "firstName",
    "lastName",
  ]);

  result = result.sort({ startTime: -1 });

  const page = Number(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  result = result.skip(skip).limit(limit);

  const checkIns = await result;

  if (!checkIns) {
    throw new NotFoundError("Not found check-ins");
  }

  const totalCheckIns = await CheckInOut.countDocuments(queryObject);
  const numOfPages = Math.ceil(totalCheckIns / limit);

  res.status(StatusCodes.OK).json({ checkIns, totalCheckIns, numOfPages });
};

export const updateCheckInByAdmin = async (req, res) => {
  checkPermissions(req.user);

  const { startTime, endTime, description } = req.body;

  if (!startTime || !endTime || !description) {
    throw new BadRequestError("Please provide all values");
  }

  const checkData = await CheckInOut.findOne({ _id: req.params.id });

  if (!checkData) {
    throw new NotFoundError("Not found check-in");
  }

  checkData.startTime = startTime;
  checkData.endTime = endTime;
  checkData.description = description;

  await checkData.save();

  res.status(200).json(checkData);
};

export const deleteCheckInByAdmin = async (req, res) => {
  checkPermissions(req.user);

  const { id } = req.params;

  const checkIn = CheckInOut.find({ _id: id });

  if (!checkIn) {
    throw new NotFoundError("Not found check-in");
  }

  await CheckInOut.deleteOne({ _id: id });

  res.status(StatusCodes.OK).json({ msg: "Check-in successfully removed" });
};
