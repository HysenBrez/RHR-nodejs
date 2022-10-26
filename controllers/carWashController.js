import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";

import CarWash from "../models/CarWash.js";
import { BadRequestError, NotFoundError, UnAuthenticatedError } from "../errors/index.js";
import { adminAndManagerPermissions, adminPermissions } from "../utils/checkPermissions.js";
import Location from "../models/Location.js";
import moment from "moment";
import { addDays } from "../utils/helpers.js";

export const carWash = async (req, res) => {
  const { userId, licensePlate, locationId, carType, washType, specialPrice, acceptSuspect } =
    req.body;

  if (!userId || !licensePlate || !locationId || !carType || !washType) {
    throw new BadRequestError("Please provide all values");
  }

  const time = moment.duration("06:00:00");
  const date = moment().subtract(time);

  const carWashCheck = await CarWash.findOne({
    licensePlate,
    createdAt: { $gte: date.toISOString(), $lt: new Date() },
  });

  if (carWashCheck) if (!acceptSuspect) return res.status(200).json({ suspected: true });

  let price;

  if (washType === "special") {
    price = specialPrice;
  } else {
    const locationPrice = await Location.findOne(
      { _id: locationId, "carType.name": carType },
      { "carType.wash.$": 1 }
    );

    price = locationPrice.carType[0].wash[washType];
  }

  const carWash = await CarWash.create({
    userId,
    licensePlate,
    locationId,
    carType,
    washType,
    specialPrice,
    finalPrice: price,
    suspect: carWashCheck ? true : false,
    createdBy: req.user.userId,
  });

  res.status(201).json({ carWash, msg: "Car Washed successfully." });
};

export const getCarsWashByUser = async (req, res) => {
  const { search, from, to } = req.query;
  const { id: userId } = req.params;

  if (!userId) throw new BadRequestError("Please provide all values");

  const today = moment({ h: 0, m: 0, s: 0 }).format();

  const queryObject = {
    createdAt: { $gte: new Date(today), $lte: addDays(today) },
    userId: mongoose.Types.ObjectId(userId),
  };

  if (search) queryObject.licensePlate = { $regex: search, $options: "i" };

  if (from) queryObject.createdAt = { $gte: new Date(from) };

  if (to) queryObject.createdAt = { $lte: addDays(to) };

  if (from && to) queryObject.createdAt = { $gte: new Date(from), $lt: addDays(to) };

  const page = Number(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  let allCarWashed = await CarWash.aggregate([
    { $match: { ...queryObject } },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "userId",
      },
    },
    { $unwind: "$userId" },
    {
      $facet: {
        metadata: [
          {
            $group: {
              _id: null,
              totalCarWashed: { $sum: 1 },
            },
          },
          { $project: { _id: 0, totalCarWashed: 1 } },
        ],
        data: [{ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit }],
      },
    },
  ]);

  const { totalCarWashed } = allCarWashed[0].metadata[0] || 0;

  if (!allCarWashed.length) throw new NotFoundError("Not found car washed.");

  const carWashed = allCarWashed[0].data.map((item) => {
    const { _id, userId, createdAt, licensePlate, carType, washType, finalPrice, suspect } = item;

    const { firstName, lastName } = userId;

    const washTypesNames = {
      outside: "Aussenreinigung",
      inside: "Innenreinigung",
      outInside: "Kombipaket",
      motorrad: "Motorrad wäsche",
      turnaround: "Turnaround",
      quickTurnaround: "Quick Turnaround",
      special: "Spezial",
    };

    return {
      _id,
      user: `${firstName} ${lastName}`,
      date: createdAt,
      licensePlate,
      carType,
      washType: washTypesNames[washType],
      finalPrice,
      suspect,
    };
  });

  const numOfPages = Math.ceil(totalCarWashed / limit) || 0;

  res.status(StatusCodes.OK).json({
    carWashed,
    totalCarWashed: totalCarWashed ? totalCarWashed : 0,
    numOfPages,
  });
};

export const getCarsWashByLocation = async (req, res) => {
  adminAndManagerPermissions(req.user);

  const { id: locationId } = req.params;

  if (!locationId) throw new BadRequestError("Please provide all values");

  const { search, userId, from, to } = req.query;

  const today = moment({ h: 0, m: 0, s: 0 }).format();

  const queryObject = {
    createdAt: { $gte: new Date(today), $lte: addDays(today) },
    locationId: mongoose.Types.ObjectId(locationId),
  };

  if (search) queryObject.licensePlate = { $regex: search, $options: "i" };

  if (userId) queryObject.userId = mongoose.Types.ObjectId(userId);

  if (from) queryObject.createdAt = { $gte: new Date(from) };
  if (to) queryObject.createdAt = { $lte: addDays(to) };
  if (from && to) queryObject.createdAt = { $gte: new Date(from), $lt: addDays(to) };

  const page = Number(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  let allCarWashed = await CarWash.aggregate([
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
      $unwind: "$userId",
    },
    {
      $facet: {
        metadata: [
          {
            $group: {
              _id: null,
              totalCarWashed: { $sum: 1 },
              totalPrice: { $sum: "$finalPrice" },
            },
          },
          {
            $project: {
              _id: 0,
              totalCarWashed: 1,
              totalPrice: 1,
            },
          },
        ],
        data: [{ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit }],
      },
    },
  ]);

  const { totalCarWashed, totalPrice } = allCarWashed[0].metadata[0] || 0;

  if (!allCarWashed.length) throw new NotFoundError("Not found car washed.");

  const carWashed = allCarWashed[0].data.map((item) => {
    const { _id, userId, createdAt, licensePlate, carType, washType, finalPrice, suspect } = item;

    const { firstName, lastName } = userId;

    const washTypesNames = {
      outside: "Aussenreinigung",
      inside: "Innenreinigung",
      outInside: "Kombipaket",
      motorrad: "Motorrad wäsche",
      turnaround: "Turnaround",
      quickTurnaround: "Quick Turnaround",
      special: "Spezial",
    };

    return {
      _id,
      user: `${firstName} ${lastName}`,
      date: createdAt,
      licensePlate,
      carType,
      washType: washTypesNames[washType],
      finalPrice,
      suspect,
    };
  });

  const numOfPages = Math.ceil(totalCarWashed / limit) || 0;

  res.status(StatusCodes.OK).json({
    carWashed,
    totalCarWashed: totalCarWashed ? totalCarWashed : 0,
    totalPrice,
    numOfPages,
  });
};

export const getCarWash = async (req, res) => {
  const { id } = req.params;

  const carWash = await CarWash.findOne({ _id: id });

  if (!carWash) {
    throw new NotFoundError("Not found car wash");
  }

  res.status(200).json(carWash);
};

export const updateCarWash = async (req, res) => {
  const { licensePlate, locationId, carType, washType, specialPrice, acceptSuspect } = req.body;

  if (!licensePlate || !locationId || !carType || !washType)
    throw new BadRequestError("Please provide all values");

  const carWash = await CarWash.findOne({ _id: req.params.id });

  if (!carWash) throw new BadRequestError("Not found Car Wash.");

  const time = moment.duration("06:00:00");

  const carWashCheck = await CarWash.findOne({
    licensePlate,
    createdAt: {
      $gte: moment(carWash.createdAt).subtract(time).format(),
      $lt: moment(carWash.createdAt).add(time).format(),
    },
  });

  if (carWashCheck) if (!acceptSuspect) return res.status(200).json({ suspected: true });

  let price;

  if (washType === "special") {
    price = specialPrice;
  } else {
    const locationPrice = await Location.findOne(
      { _id: locationId, "carType.name": carType },
      { "carType.wash.$": 1 }
    );

    price = locationPrice.carType[0].wash[washType];
  }

  carWash.licensePlate = licensePlate;
  carWash.locationId = locationId;
  carWash.carType = carType;
  carWash.washType = washType;
  carWash.specialPrice = specialPrice;
  carWash.finalPrice = price;
  carWash.suspect = carWashCheck ? true : false;

  await carWash.save();

  res.status(200).json({ carWash, msg: "Car wash successfully updated." });
};

export const updateCarWashSuspect = async (req, res) => {
  const { carWashId } = req.params;

  if (!carWashId) throw new BadRequestError("Please provide all values");

  const carWash = await CarWash.findOneAndUpdate(
    { _id: carWashId },
    { suspect: false },
    { new: true }
  );

  if (!carWash) throw new NotFoundError("Not found car wash.");

  res.status(200).json({ carWash, msg: "Car wash successfully updated." });
};

export const deleteCarWash = async (req, res) => {
  adminAndManagerPermissions(req.user);

  const { id } = req.params;

  const carWash = CarWash.find({ _id: id });

  if (!carWash) throw new NotFoundError("Not found car wash!");

  await CarWash.deleteOne({ _id: id });

  res.status(StatusCodes.OK).json({ msg: "Car wash successfully removed" });
};

export const getExcel = async (req, res) => {
  adminPermissions(req.user);

  const { search, from, to, locationId, userId } = req.query;

  const today = moment({ h: 0, m: 0, s: 0 }).format();

  const queryObject = {
    createdAt: { $gte: new Date(today), $lte: addDays(today) },
  };

  if (search) queryObject.licensePlate = { $regex: search, $options: "i" };

  if (from) queryObject.createdAt = { $gte: new Date(from) };

  if (to) queryObject.createdAt = { $lte: addDays(to) };

  if (from && to) queryObject.createdAt = { $gte: new Date(from), $lt: addDays(to) };

  if (locationId) queryObject.locationId = mongoose.Types.ObjectId(locationId);

  if (userId) queryObject.userId = mongoose.Types.ObjectId(userId);

  let allCarWashed = await CarWash.aggregate([
    { $match: { ...queryObject } },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "userId",
      },
    },
    { $unwind: "$userId" },
    {
      $facet: {
        metadata: [
          {
            $group: {
              _id: null,
              totalCarWashed: { $sum: 1 },
              totalPrice: { $sum: "$finalPrice" },
            },
          },
          { $project: { _id: 0, totalCarWashed: 1, totalPrice: 1 } },
        ],
        data: [{ $sort: { createdAt: -1 } }],
      },
    },
  ]);

  const { totalCarWashed, totalPrice } = allCarWashed[0].metadata[0] || 0;

  if (!allCarWashed.length) throw new NotFoundError("No results found.");

  const data = allCarWashed[0].data.map((item) => {
    const { userId, createdAt, licensePlate, carType, washType, finalPrice } = item;

    const { firstName, lastName } = userId;

    const washTypesNames = {
      outside: "Aussenreinigung",
      inside: "Innenreinigung",
      outInside: "Kombipaket",
      motorrad: "Motorrad wäsche",
      turnaround: "Turnaround",
      quickTurnaround: "Quick Turnaround",
      special: "Spezial",
    };

    return {
      user: `${firstName} ${lastName}`,
      date: createdAt,
      licensePlate,
      carType,
      washType: washTypesNames[washType],
      finalPrice,
    };
  });

  res.status(StatusCodes.OK).json({
    data,
    totalCarWashed: totalCarWashed || 0,
    totalPrice: totalPrice || 0,
  });
};
