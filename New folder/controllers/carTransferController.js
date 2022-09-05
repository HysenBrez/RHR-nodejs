import { StatusCodes } from "http-status-codes";
import moment from "moment";

import CarTransfer from "../models/CarTransfer.js";
import Location from "../models/Location.js";
import { BadRequestError, NotFoundError } from "../errors/index.js";
import checkPermissions from "../utils/checkPermissions.js";

export const carTransfer = async (req, res) => {
  const {
    userId,
    licensePlate,
    locationId,
    carType,
    transferType,
    transferDistance,
    finalPrice,
  } = req.body;

  if (!userId || !licensePlate || !locationId || !carType || !transferType) {
    throw new BadRequestError("Please provide all values");
  }

  let price;

  const locationPrice = await Location.findOne(
    {
      _id: locationId,
      "carType.name": carType,
    },
    { "carType.transfer.$": 1 }
  );

  if (transferType === "presumptive") {
    price =
      Number(locationPrice.carType[0].transfer.base) +
      Number(transferDistance) *
        Number(locationPrice.carType[0].transfer.perkm);
  } else {
    price = locationPrice.carType[0].transfer[transferType];
  }

  const time = moment.duration("06:00:00");
  const date = moment().subtract(time);

  const carTransferCheck = await CarTransfer.findOne({
    licensePlate,
    createdAt: { $gte: date.toISOString(), $lt: new Date() },
  });

  const carTransfer = await CarTransfer.create({
    userId,
    licensePlate,
    locationId,
    carType,
    transferType,
    transferDistance,
    finalPrice: price,
    suspect: carTransferCheck ? true : false,
    createdBy: req.user.userId,
  });

  res.status(201).json(carTransfer);
};

export const getCarsTransferByUser = async (req, res) => {
  const { id: userId } = req.params;

  if (!userId) {
    throw new BadRequestError("Please provide all values");
  }

  const { search, from, to } = req.query;

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

  let result = CarTransfer.find(queryObject).populate("locationId", [
    "_id",
    "locationName",
    "locationType",
  ]);

  result = result.sort({ createdAt: -1 });

  const page = Number(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  result = result.skip(skip).limit(limit);

  const carsTransfer = await result;

  if (!carsTransfer) {
    throw new NotFoundError("Not found cars wash");
  }

  const totalCarsTransfer = await CarTransfer.countDocuments(queryObject);
  const numOfPages = Math.ceil(totalCarsTransfer / limit);

  res
    .status(StatusCodes.OK)
    .json({ carsTransfer, totalCarsTransfer, numOfPages });
};

export const getCarsTransferByLocation = async (req, res) => {
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

  let result = CarTransfer.find(queryObject)
    .populate("userId", ["_id", "firstName", "lastName"])
    .populate("locationId", ["_id", "locationName", "locationType"]);

  result = result.sort({ createdAt: -1 });

  const page = Number(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  result = result.skip(skip).limit(limit);

  const carsTransferLocation = await result;

  if (!carsTransferLocation) {
    throw new NotFoundError("Not found cars wash");
  }

  const totalCarsTransferLocation = await CarTransfer.countDocuments(
    queryObject
  );
  const numOfPages = Math.ceil(totalCarsTransferLocation / limit);

  res
    .status(StatusCodes.OK)
    .json({ carsTransferLocation, totalCarsTransferLocation, numOfPages });
};

export const getCarTransfer = async (req, res) => {
  const { id } = req.params;

  const carTransfer = await CarTransfer.findOne({ _id: id });

  if (!carTransfer) {
    throw new NotFoundError("Not found car transfer");
  }

  res.status(200).json(carTransfer);
};

export const updateCarTransfer = async (req, res) => {
  const {
    licensePlate,
    locationId,
    carType,
    transferType,
    transferDistance,
    finalPrice,
  } = req.body;

  if (!licensePlate || !locationId || !carType || !transferType) {
    throw new BadRequestError("Please provide all values");
  }

  const carTransfer = await CarTransfer.findOneAndUpdate(
    { _id: req.params.id },
    {
      licensePlate,
      locationId,
      carType,
      transferType,
      transferDistance,
      finalPrice,
    },
    { new: true }
  );

  res.status(200).json(carTransfer);
};

export const updateCarTransferSuspect = async (req, res) => {
  const { carTransferId } = req.params;

  if (!carTransferId) {
    throw new BadRequestError("Please provide all values");
  }

  const carTransfer = await CarTransfer.findOneAndUpdate(
    { _id: carTransferId },
    { suspect: false },
    { new: true }
  );

  if (carTransfer === null) throw new NotFoundError("Not found car transfer.");

  res.status(200).json(carTransfer);
};

export const deleteCarTransfer = async (req, res) => {
  checkPermissions(req.user);

  const { id } = req.params;

  const carTransfer = CarTransfer.find({ _id: id });

  if (!carTransfer) {
    throw new NotFoundError("Not found car wash!");
  }

  await CarTransfer.deleteOne({ _id: id });

  res.status(StatusCodes.OK).json({ msg: "Car wash successfully removed" });
};
