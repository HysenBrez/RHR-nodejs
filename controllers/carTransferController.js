import moment from "moment";
import { StatusCodes } from "http-status-codes";

import CarTransfer from "../models/CarTransfer.js";
import Location from "../models/Location.js";
import { BadRequestError, NotFoundError } from "../errors/index.js";
import { adminAndManagerPermissions, adminPermissions } from "../utils/checkPermissions.js";
import { addDays } from "../utils/helpers.js";
import mongoose from "mongoose";

export const carTransfer = async (req, res) => {
  const {
    userId,
    licensePlate,
    locationId,
    carType,
    transferType,
    transferMethod,
    transferDistance,
    transferPlace,
    acceptSuspect,
  } = req.body;

  if (!userId || !licensePlate || !locationId || !carType || !transferType || !transferMethod)
    throw new BadRequestError("Please provide all values");

  const time = moment.duration("06:00:00");
  const date = moment().subtract(time);

  const carTransferCheck = await CarTransfer.findOne({
    licensePlate,
    createdAt: { $gte: date.toISOString(), $lt: new Date() },
  });

  if (carTransferCheck) if (!acceptSuspect) return res.status(200).json({ suspected: true });

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
      Number(transferDistance) * Number(locationPrice.carType[0].transfer.perkm);
  } else {
    price = locationPrice.carType[0].transfer[transferType];
  }

  const carTransfer = await CarTransfer.create({
    userId,
    licensePlate,
    locationId,
    carType,
    transferType,
    transferMethod,
    transferDistance,
    transferPlace,
    finalPrice: price,
    suspect: carTransferCheck ? true : false,
    createdBy: req.user.userId,
  });

  res.status(201).json({ carTransfer, msg: "Car Transfered Successfully." });
};

export const getCarsTransferByUser = async (req, res) => {
  const { id: userId } = req.params;

  if (!userId) throw new BadRequestError("Please provide all values");

  const { search, from, to } = req.query;

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

  let allCarTransferred = await CarTransfer.aggregate([
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
              totalCarTransferred: { $sum: 1 },
            },
          },
          {
            $project: { _id: 0, totalCarTransferred: 1 },
          },
        ],
        data: [{ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit }],
      },
    },
  ]);

  const { totalCarTransferred } = allCarTransferred[0].metadata[0] || 0;

  if (!allCarTransferred.length)
    throw new NotFoundError("No car was found that has been transferred.");

  const carTransferred = allCarTransferred[0].data.map((item) => {
    const {
      _id,
      userId,
      createdAt,
      licensePlate,
      carType,
      transferMethod,
      transferType,
      transferPlace,
      finalPrice,
      suspect,
    } = item;

    const { firstName, lastName } = userId;

    const transferTypesNames = {
      hzp: "HZP",
      hbp: "HBP",
      apdt: "AP-DT",
      presumptive: "Transfer KM",
    };

    const transferMethods = {
      collection: "Collection",
      delivery: "Delivery",
    };

    return {
      _id,
      user: `${firstName || "User"} ${lastName || "Deleted"}`,
      date: createdAt,
      licensePlate,
      carType,
      transferMethod: transferMethods[transferMethod],
      transferType: transferTypesNames[transferType],
      transferPlace,
      finalPrice: req.user.role === "admin" ? finalPrice : undefined,
      suspect,
    };
  });

  const numOfPages = Math.ceil(totalCarTransferred / limit) || 0;

  res.status(StatusCodes.OK).json({
    carTransferred,
    totalCarTransferred: totalCarTransferred ? totalCarTransferred : 0,
    numOfPages,
  });
};

export const getCarsTransferByLocation = async (req, res) => {
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

  let allCarTransferred = await CarTransfer.aggregate([
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
              totalCarTransferred: { $sum: 1 },
              totalPrice: { $sum: "$finalPrice" },
            },
          },
          {
            $project: { _id: 0, totalCarTransferred: 1, totalPrice: 1 },
          },
        ],
        data: [{ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit }],
      },
    },
  ]);

  const { totalCarTransferred, totalPrice } = allCarTransferred[0].metadata[0] || 0;

  if (!allCarTransferred.length)
    throw new NotFoundError("No car was found that has been transferred.");

  const carTransferred = allCarTransferred[0].data.map((item) => {
    const {
      _id,
      userId,
      createdAt,
      licensePlate,
      carType,
      transferMethod,
      transferType,
      transferPlace,
      finalPrice,
      suspect,
    } = item;

    const { firstName, lastName } = userId;

    const transferTypesNames = {
      hzp: "HZP",
      hbp: "HBP",
      apdt: "AP-DT",
      presumptive: "Transfer KM",
    };

    return {
      _id,
      user: `${firstName} ${lastName}`,
      date: createdAt,
      licensePlate,
      carType,
      transferMethod,
      transferType: transferTypesNames[transferType],
      transferPlace,
      finalPrice: req.user.role === "admin" ? finalPrice : undefined,
      suspect,
    };
  });

  const numOfPages = Math.ceil(totalCarTransferred / limit) || 0;

  res.status(StatusCodes.OK).json({
    carTransferred,
    totalCarTransferred: totalCarTransferred ? totalCarTransferred : 0,
    totalPrice,
    numOfPages,
  });
};

export const getCarTransfer = async (req, res) => {
  const { id } = req.params;

  const carTransfer = await CarTransfer.findOne({ _id: id });

  if (!carTransfer) throw new NotFoundError("Not found car transfer");

  res.status(200).json(carTransfer);
};

export const updateCarTransfer = async (req, res) => {
  const {
    licensePlate,
    locationId,
    carType,
    transferType,
    transferMethod,
    transferDistance,
    transferPlace,
    acceptSuspect,
  } = req.body;

  if (!licensePlate || !locationId || !carType || !transferType || !transferMethod)
    throw new BadRequestError("Please provide all values");

  const carTransfer = await CarTransfer.findOne({ _id: req.params.id });

  if (!carTransfer) throw new BadRequestError("Not found Car Transfer.");

  const time = moment.duration("06:00:00");

  const carTransferCheck = await CarTransfer.findOne({
    licensePlate,
    createdAt: {
      $gte: moment(carTransfer.createdAt).subtract(time).format(),
      $lt: moment(carTransfer.createdAt).add(time).format(),
    },
  });

  if (carTransferCheck) if (!acceptSuspect) return res.status(200).json({ suspected: true });

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
      Number(transferDistance) * Number(locationPrice.carType[0].transfer.perkm);
  } else {
    price = locationPrice.carType[0].transfer[transferType];
  }

  carTransfer.licensePlate = licensePlate;
  carTransfer.locationId = locationId;
  carTransfer.carType = carType;
  carTransfer.transferType = transferType;
  carTransfer.transferMethod = transferMethod;
  carTransfer.transferDistance = transferDistance;
  carTransfer.transferPlace = transferPlace;
  carTransfer.finalPrice = price;
  carTransfer.suspect = carTransferCheck ? true : false;

  await carTransfer.save();

  res.status(200).json({ carTransfer, msg: "Car transfer successfully updated." });
};

export const updateCarTransferSuspect = async (req, res) => {
  const { carTransferId } = req.params;

  if (!carTransferId) throw new BadRequestError("Please provide all values");

  const carTransfer = await CarTransfer.findOneAndUpdate(
    { _id: carTransferId },
    { suspect: false },
    { new: true }
  );

  if (!carTransfer) throw new NotFoundError("Not found car transfer.");

  res.status(200).json({ carTransfer, msg: "Car transfer successfully updated." });
};

export const deleteCarTransfer = async (req, res) => {
  adminAndManagerPermissions(req.user);

  const { id } = req.params;

  const carTransfer = CarTransfer.find({ _id: id });

  if (!carTransfer) throw new NotFoundError("Not found car wash!");

  await CarTransfer.deleteOne({ _id: id });

  res.status(StatusCodes.OK).json({ msg: "Car wash successfully removed" });
};

export const getExcel = async (req, res) => {
  adminAndManagerPermissions(req.user);

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

  let allCarTransferred = await CarTransfer.aggregate([
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
              totalCarTransferred: { $sum: 1 },
              totalPrice: { $sum: "$finalPrice" },
            },
          },
          { $project: { _id: 0, totalCarTransferred: 1, totalPrice: 1 } },
        ],
        data: [{ $sort: { createdAt: -1 } }],
      },
    },
  ]);

  const { totalCarTransferred, totalPrice } = allCarTransferred[0].metadata[0] || 0;

  if (!allCarTransferred.length) throw new NotFoundError("No results found.");

  const data = allCarTransferred[0].data.map((item) => {
    const {
      userId,
      createdAt,
      licensePlate,
      carType,
      transferMethod,
      transferType,
      transferPlace,
      finalPrice,
    } = item;

    const { firstName, lastName } = userId;

    const transferTypes = {
      hzp: "HZP",
      hbp: "HBP",
      apdt: "AP-DT",
      presumptive: "Transfer KM",
    };

    const transferMethods = {
      collection: "Collection",
      delivery: "Delivery",
    };

    return {
      user: `${firstName} ${lastName}`,
      date: createdAt,
      licensePlate,
      carType,
      transferMethod: transferMethods[transferMethod],
      transferType: transferTypes[transferType],
      transferPlace,
      finalPrice: req.user.role === "admin" ? finalPrice : undefined,
    };
  });

  res.status(StatusCodes.OK).json({
    data,
    totalCarTransferred: totalCarTransferred || 0,
    totalPrice: totalPrice || 0,
  });
};
