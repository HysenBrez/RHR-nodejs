import CheckInOut from "../models/CheckInOut.js";
import moment from "moment";
import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";

import { BadRequestError, NotFoundError } from "../errors/index.js";
import { adminPermissions } from "../utils/checkPermissions.js";
import {
  calcDailySalary,
  format24h,
  diffInMins,
  toHoursAndMins,
  checkSuspect,
  addDays,
  equalDays,
  addMonths,
} from "../utils/helpers.js";
import User from "../models/User.js";

export const checkForDate = async (req, res) => {
  const { userId } = req.params;

  if (!userId) throw new BadRequestError("Please provide all values");

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
        _id: 1,
        startTime: 1,
        endTime: 1,
        active: 1,
        attempt: 1,
        breaks: 1,
        description: 1,
      },
    },
  ]);

  const activeBreak =
    check.length && check[0].breaks.length
      ? check[0].breaks.filter((b) => b.active == true)[0]
        ? true
        : false
      : false;

  if (!check.length) {
    res.status(200).json({ active: false, attempt: "0", activeBreak });
  } else {
    res.status(200).json({ ...check[0], activeBreak });
  }
};

export const checkIn = async (req, res) => {
  const { userId, startTime, startTimeLocation } = req.body;

  if (!userId || !startTime) {
    throw new BadRequestError("Please provide all values");
  }

  const checkData = await CheckInOut.aggregate([
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
        onlyDate: { $eq: moment().format("YYYY-MM-DD") },
        userId: mongoose.Types.ObjectId(userId),
      },
    },
  ]);

  if (checkData.length)
    throw new BadRequestError("You can't create check-in twice for the same day.");

  const checkIn = await CheckInOut.create({
    userId,
    startTime,
    active: true,
    attempt: 1,
    startTimeLocation,
    suspect: true,
    createdBy: req.user.userId,
    workHoursInMins: 0,
  });

  res.status(201).json(checkIn);
};

export const startBreak = async (req, res) => {
  const { checkInId, startBreak } = req.body;

  if (!checkInId || !startBreak) throw new BadRequestError("Please provide all values");

  const checkBreak = await CheckInOut.findOne({
    _id: checkInId,
    breaks: { $exists: true, $elemMatch: { active: true } },
  });

  if (checkBreak) throw new BadRequestError("Please end last break.");

  const checkIn = await CheckInOut.findOneAndUpdate(
    { _id: checkInId },
    { $addToSet: { breaks: { startBreak, active: true, endBreak: null } } },
    { new: true }
  );

  if (!checkIn) throw new NotFoundError("Not found check-in");

  res.status(201).json(checkIn);
};

export const endBreak = async (req, res) => {
  const { checkInId, breakId, endBreak } = req.body;

  if (!checkInId || !breakId || !endBreak) throw new BadRequestError("Please provide all values");

  const checkData = await CheckInOut.findOneAndUpdate(
    { _id: checkInId, "breaks._id": breakId },
    { $set: { "breaks.$.endBreak": endBreak, "breaks.$.active": false } },
    { new: true }
  );

  if (!checkData) throw new NotFoundError("Not found break.");

  res.status(201).json(checkData);
};

export const checkOut = async (req, res) => {
  const { checkInId, endTime, endTimeLocation } = req.body;

  if (!checkInId || !endTime) throw new BadRequestError("Please provide all values");

  const checkIn = await CheckInOut.findOne({ _id: checkInId });

  if (!checkIn) throw new NotFoundError("Not found check-in");

  let minutes = diffInMins(endTime, checkIn.startTime);

  checkIn.breaks.map((b) => (minutes -= diffInMins(b.endBreak, b.startBreak)));

  checkIn.endTime = endTime;
  checkIn.endTimeLocation = endTimeLocation;
  checkIn.active = false;
  checkIn.workHoursInMins = minutes;
  checkIn.dailySalary = calcDailySalary(minutes, req.user.hourlyPay || 0);
  checkIn.suspect = checkSuspect(endTime);

  await checkIn.save();

  res.status(200).json(checkIn);
};

export const getCheckInsByUser = async (req, res) => {
  const { userId } = req.params;

  const { from, to, total } = req.query;

  let date20 = moment().set({ D: 20 }).format("YYYY-MM-DD");

  if (moment().format("D") < 20) date20 = moment(date20).subtract(1, "months").format("YYYY-MM-DD");

  const queryObject = {
    startTime: { $gte: new Date(date20), $lte: addMonths(date20) }, // 20-19
  };

  if (!userId) throw new BadRequestError("Please provide all values");

  if (userId) queryObject.userId = mongoose.Types.ObjectId(userId);

  if (from) queryObject.startTime = { $gte: new Date(from) };

  if (to) queryObject.startTime = { $lte: addDays(to) };

  if (from && to) queryObject.startTime = { $gte: new Date(from), $lte: addDays(to) };

  const page = Number(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  let allCheckIns = await CheckInOut.aggregate([
    { $match: { ...queryObject } },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "userId",
      },
    },
    {
      $facet: {
        metadata: [
          {
            $group: {
              _id: null,
              totalCheckIns: { $sum: 1 },
              totalMins: { $sum: "$workHoursInMins" },
              totalSalary: { $sum: "$dailySalary" },
            },
          },
          {
            $project: {
              _id: 0,
              totalCheckIns: 1,
              totalMins: 1,
              totalSalary: 1,
            },
          },
        ],
        data: [{ $sort: { startTime: -1 } }, { $skip: skip }, { $limit: limit }],
      },
    },
  ]);

  const { totalCheckIns, totalMins, totalSalary } = allCheckIns[0].metadata[0] || 0;

  if (!allCheckIns.length) throw new NotFoundError("Not found check-ins");

  const checkIns = allCheckIns[0].data.map((item) => {
    const { _id, userId, startTime, endTime, workHoursInMins, dailySalary, suspect } = item;

    const { firstName, lastName } = userId[0];

    return {
      _id,
      user: `${firstName} ${lastName}`,
      date: moment(startTime).format("DD MMMM, YYYY"),
      startTime: format24h(startTime),
      endTime: !checkSuspect(endTime) ? format24h(endTime) : "-",
      workHours: toHoursAndMins(workHoursInMins, true),
      dailySalary,
      suspect: equalDays(startTime) ? false : suspect,
    };
  });

  const numOfPages = Math.ceil(totalCheckIns / limit);

  let user;

  if (total == "true") {
    user = await User.findOne(
      { _id: userId },
      { firstName: 1, lastName: 1, email: 1, street: 1, postalCode: 1, ahv: 1, hourlyPay: 1 }
    );
  }

  res.status(StatusCodes.OK).json({
    user: total ? user : undefined,
    checkIns: !total ? checkIns : undefined,
    totalHours: totalMins ? toHoursAndMins(totalMins, true) : 0,
    totalSalary: totalSalary || 0,
    totalCheckIns: totalCheckIns ? totalCheckIns : 0,
    numOfPages: numOfPages ? numOfPages : 0,
  });
};

export const checkInDescription = async (req, res) => {
  const { userId, startTime, description } = req.body;

  if (!userId || !startTime || !description) throw new BadRequestError("Please provide all values");

  const checkIn = await CheckInOut.findOne({ userId, startTime });

  if (!checkIn) throw new NotFoundError("Not found check-in");

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

  if (!checkIn) throw new NotFoundError("Not found check-in");

  const activeBreak = checkIn.breaks.length
    ? checkIn.breaks.filter((b) => b.active == true)[0]
      ? true
      : false
    : false;

  res.status(200).json({
    ...checkIn._doc,
    endTime: equalDays(checkIn.startTime) && checkSuspect(checkIn.endTime) ? null : checkIn.endTime,
    activeBreak,
    workHours: toHoursAndMins(checkIn.workHoursInMins, true),
  });
};

export const checkInByAdmin = async (req, res) => {
  adminPermissions(req.user);

  const { userId, startTime, endTime, description } = req.body;

  if (!userId || !startTime || !endTime) throw new BadRequestError("Please provide all values");

  const checkData = await CheckInOut.aggregate([
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
        onlyDate: { $eq: moment().format("YYYY-MM-DD") },
        userId: mongoose.Types.ObjectId(userId),
      },
    },
  ]);

  if (checkData.length)
    throw new BadRequestError("You can't create check-in twice for the same day.");

  const minutes = diffInMins(endTime, startTime);

  const checkIn = await CheckInOut.create({
    userId,
    startTime,
    endTime,
    active: false,
    attempt: 1,
    workHoursInMins: minutes,
    dailySalary: calcDailySalary(minutes, req.user.hourlyPay || 0),
    suspect: checkSuspect(endTime),
    description,
    createdBy: req.user.userId,
  });

  res.status(201).json(checkIn);
};

export const getCheckIns = async (req, res) => {
  adminPermissions(req.user);

  const { userId, locationId, from, to } = req.query;

  const today = moment({ h: 0, m: 0, s: 0 }).format();

  let queryObject = {
    startTime: { $gte: new Date(today), $lte: addDays(today) },
  };

  if (userId) queryObject.userId = mongoose.Types.ObjectId(userId);

  if (locationId) {
    const usersIds = await User.distinct("_id", { locationId });
    queryObject.userId = { $in: usersIds };
  }

  if (from)
    queryObject.startTime = {
      $gte: new Date(from),
    };

  if (to)
    queryObject.startTime = {
      $lte: addDays(to),
    };

  if (from && to)
    queryObject.startTime = {
      $gte: new Date(from),
      $lte: addDays(to),
    };

  const page = Number(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const allCheckIns = await CheckInOut.aggregate([
    {
      $match: { ...queryObject },
    },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "userId",
      },
    },
    {
      $facet: {
        metadata: [
          {
            $group: {
              _id: null,
              totalCheckIns: { $sum: 1 },
              totalMins: { $sum: "$workHoursInMins" },
              totalSalary: { $sum: "$dailySalary" },
            },
          },
          {
            $project: {
              _id: 0,
              totalCheckIns: 1,
              totalMins: 1,
              totalSalary: 1,
            },
          },
        ],
        data: [{ $sort: { startTime: -1 } }, { $skip: skip }, { $limit: limit }],
      },
    },
  ]);

  const { totalCheckIns, totalMins, totalSalary } = allCheckIns[0].metadata[0] || 0;

  if (!allCheckIns.length) throw new NotFoundError("Not found check-ins");

  const checkIns = allCheckIns[0].data.map((item) => {
    const { _id, userId, startTime, endTime, workHoursInMins, dailySalary, suspect } = item;

    const { firstName, lastName } = userId[0];

    return {
      _id,
      user: `${firstName} ${lastName}`,
      date: moment(startTime).format("DD MMMM, YYYY"),
      startTime: format24h(startTime),
      endTime: !checkSuspect(endTime) ? format24h(endTime) : "-",
      workHours: toHoursAndMins(workHoursInMins, true),
      dailySalary,
      suspect: equalDays(startTime) ? false : suspect,
    };
  });

  const numOfPages = Math.ceil(totalCheckIns / limit);

  res.status(StatusCodes.OK).json({
    checkIns,
    totalHours: totalMins ? toHoursAndMins(totalMins, true) : 0,
    totalSalary: totalSalary || 0,
    totalCheckIns: totalCheckIns ? totalCheckIns : 0,
    numOfPages: numOfPages ? numOfPages : 0,
  });
};

export const updateCheckInAdmin = async (req, res) => {
  adminPermissions(req.user);

  const { startTime, endTime, breaks, description } = req.body;

  if (!startTime || !endTime) throw new BadRequestError("Please provide all values");

  const checkIn = await CheckInOut.findOne({ _id: req.params.id });

  if (!checkIn) throw new NotFoundError("Not found check-in");

  let minutes = diffInMins(endTime, checkIn.startTime);

  breaks.map((b) => (minutes -= diffInMins(b.endBreak, b.startBreak)));

  checkIn.startTime = startTime;
  checkIn.endTime = endTime;
  checkIn.breaks = breaks;
  checkIn.description = description;
  checkIn.active = false;
  checkIn.workHoursInMins = minutes;
  checkIn.dailySalary = calcDailySalary(minutes, req.user.hourlyPay || 0);
  checkIn.suspect = checkSuspect(endTime);

  await checkIn.save();

  res.status(200).json({ checkIn, msg: "Check-in successfully updated!" });
};

export const deleteCheckInAdmin = async (req, res) => {
  adminPermissions(req.user);

  const { id } = req.params;

  const checkIn = CheckInOut.find({ _id: id });

  if (!checkIn) throw new NotFoundError("Not found check-in");

  await CheckInOut.deleteOne({ _id: id });

  res.status(StatusCodes.OK).json({ msg: "Check-in successfully removed" });
};

export const getExcelFile = async (req, res) => {
  adminPermissions(req.user);

  const { userId, locationId, from, to } = req.query;

  const queryObject = {
    suspect: false,
  };

  if (userId) queryObject.userId = userId;

  // if (locationId) queryObject.locationId = locationId;

  if (from)
    queryObject.startTime = {
      $gte: new Date(from),
    };

  if (to)
    queryObject.startTime = {
      $lte: addDays(to),
    };

  if (from && to)
    queryObject.startTime = {
      $gte: new Date(from),
      $lt: addDays(to),
    };

  let result, totalData;

  result = CheckInOut.find(queryObject, " -_id -createdBy -updatedAt -__v").populate("userId", [
    "firstName",
    "lastName",
  ]);

  result = result.sort({ startTime: -1 });

  let data = await result;

  let totalMins = 0;
  let totalSalary = 0;

  data = data.map((item) => {
    const {
      userId: { firstName, lastName },
      startTime,
      startTimeLocation: startLoc,
      endTime,
      endTimeLocation: endLoc,
      workHoursInMins,
      dailySalary,
    } = item;

    if (workHoursInMins) {
      totalMins += workHoursInMins;
      totalSalary += dailySalary;
    }

    return {
      user: `${firstName} ${lastName}`,
      date: moment(startTime).format("DD-MM-YYYY"),
      checkIn: startLoc
        ? `${format24h(startTime)} (${startLoc?.address?.road}, ${startLoc?.address?.city})`
        : format24h(startTime),
      checkOut: endLoc
        ? `${format24h(endTime)} (${endLoc?.address?.road}, ${endLoc?.address?.city})`
        : format24h(endTime),
      workHours: toHoursAndMins(workHoursInMins, true),
      dailySalary,
    };
  });

  totalData = await CheckInOut.countDocuments(queryObject);

  if (!data) throw new NotFoundError("Not found data!");

  res.status(StatusCodes.OK).json({
    data,
    totalData,
    totalHours: toHoursAndMins(totalMins, true),
    totalSalary: totalSalary.toFixed(2),
  });
};
