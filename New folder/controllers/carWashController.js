import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";

import CarWash from "../models/CarWash.js";
import {
  BadRequestError,
  NotFoundError,
  UnAuthenticatedError,
} from "../errors/index.js";
import checkPermissions from "../utils/checkPermissions.js";
import Location from "../models/Location.js";
import moment from "moment";

export const carWash = async (req, res) => {
  const { userId, licensePlate, locationId, carType, washType, specialPrice } =
    req.body;

  if (!userId || !licensePlate || !locationId || !carType || !washType) {
    throw new BadRequestError("Please provide all values");
  }

  let price;

  if (washType === "special") {
    price = specialPrice;
  } else {
    const locationPrice = await Location.findOne(
      {
        _id: locationId,
        "carType.name": carType,
      },
      { "carType.wash.$": 1 }
    );

    price = locationPrice.carType[0].wash[washType];
  }

  const time = moment.duration("06:00:00");
  const date = moment().subtract(time);

  const carWashCheck = await CarWash.findOne({
    licensePlate,
    createdAt: { $gte: date.toISOString(), $lt: new Date() },
  });

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

  res.status(201).json(carWash);
};

export const getCarsWashByUser = async (req, res) => {
  const { search, from, to } = req.query;
  const { id: userId } = req.params;

  if (!userId) {
    throw new BadRequestError("Please provide all values");
  }

  const queryObject = { userId };

  if (search) {
    queryObject.licensePlate = { $regex: search, $options: "i" };
  }

  if (from)
    queryObject.createdAt = {
      $gte: new Date(from),
    };
  if (to)
    queryObject.createdAt = {
      $lte: new Date(to), // should be +1 day
    };
  if (from && to)
    queryObject.createdAt = {
      $gte: new Date(from),
      $lt: new Date(to),
    };

  let result = CarWash.find(queryObject).populate("locationId", [
    "_id",
    "locationName",
    "locationType",
  ]);

  result = result.sort({ createdAt: -1 });

  const page = Number(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  result = result.skip(skip).limit(limit);

  const carsWash = await result;

  if (!carsWash) {
    throw new NotFoundError("Not found cars wash");
  }

  const totalCarsWash = await CarWash.countDocuments(queryObject);
  const numOfPages = Math.ceil(totalCarsWash / limit);

  res.status(StatusCodes.OK).json({ carsWash, totalCarsWash, numOfPages });
};

export const getCarsWashByLocation = async (req, res) => {
  checkPermissions(req.user);

  const { id: locationId } = req.params;

  if (!locationId) {
    throw new BadRequestError("Please provide all values");
  }

  const { search, userId, from, to } = req.query;

  const queryObject = { locationId };

  if (search) {
    queryObject.licensePlate = { $regex: search, $options: "i" };
  }

  if (userId) queryObject.userId = userId;

  if (from)
    queryObject.createdAt = {
      $gte: new Date(from),
    };
  if (to)
    queryObject.createdAt = {
      $lte: new Date(to), // should be +1 day
    };
  if (from && to)
    queryObject.createdAt = {
      $gte: new Date(from),
      $lt: new Date(to),
    };

  let result = CarWash.find(queryObject)
    .populate("userId", ["_id", "firstName", "lastName"])
    .populate("locationId", ["_id", "locationName", "locationType"]);

  result = result.sort({ createdAt: -1 });

  const page = Number(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  result = result.skip(skip).limit(limit);

  const carsWashLocation = await result;

  if (!carsWashLocation) {
    throw new NotFoundError("Not found cars wash");
  }

  const totalCarsWashLocation = await CarWash.countDocuments(queryObject);
  const numOfPages = Math.ceil(totalCarsWashLocation / limit);

  res
    .status(StatusCodes.OK)
    .json({ carsWashLocation, totalCarsWashLocation, numOfPages });
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
  const {
    licensePlate,
    locationId,
    carType,
    washType,
    specialPrice,
    finalPrice,
  } = req.body;

  if (!licensePlate || !locationId || !carType || !washType) {
    throw new BadRequestError("Please provide all values");
  }

  const carWash = await CarWash.findOneAndUpdate(
    { _id: req.params.id },
    {
      licensePlate,
      locationId,
      carType,
      washType,
      specialPrice,
      finalPrice,
    },
    { new: true }
  );

  res.status(200).json(carWash);
};

export const updateCarWashSuspect = async (req, res) => {
  const { carWashId } = req.params;

  if (!carWashId) {
    throw new BadRequestError("Please provide all values");
  }

  const carWash = await CarWash.findOneAndUpdate(
    { _id: carWashId },
    { suspect: false },
    { new: true }
  );

  if (carWash === null) throw new NotFoundError("Not found car wash.");

  res.status(200).json(carWash);
};

export const deleteCarWash = async (req, res) => {
  checkPermissions(req.user);

  const { id } = req.params;

  const carWash = CarWash.find({ _id: id });

  if (!carWash) {
    throw new NotFoundError("Not found car wash!");
  }

  await CarWash.deleteOne({ _id: id });

  res.status(StatusCodes.OK).json({ msg: "Car wash successfully removed" });
};
