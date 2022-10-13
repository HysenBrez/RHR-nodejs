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
    { $group: { _id: null, totalCount: { $sum: 1 }, totalPrice: { $sum: "$finalPrice" } } },
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

export const carWashStats = async (req, res) => {
  let carWash = await CarWash.aggregate([
    {
      $lookup: {
        from: "locations",
        localField: "locationId",
        foreignField: "_id",
        as: "locationId",
      },
    },
    { $unwind: "$locationId" },
    {
      $group: {
        _id: {
          year: { $substr: ["$createdAt", 0, 4] },
          month: { $substr: ["$createdAt", 5, 2] },
          day: { $substr: ["$createdAt", 8, 2] },
        },
        data: { $push: { location: "$locationId.locationName" } },
      },
    },
    { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
    { $limit: 7 },
  ]);

  const dietlikonArray = [];
  const klotenArray = [];
  const zürichArray = [];

  const dates = carWash.map((item) => {
    const {
      _id: { year, month, day },
      data,
    } = item;

    const date = moment({ year, month, day }).format("DD/MM/YYYY");

    let Dietlikon = 0;
    let Kloten = 0;
    let Zürich = 0;

    data.forEach((value) => {
      const { location } = value;

      if (location == "Dietlikon") Dietlikon += 1;
      if (location == "Kloten") Kloten += 1;
      if (location == "Zürich") Zürich += 1;
    });

    dietlikonArray.push(Dietlikon);
    klotenArray.push(Kloten);
    zürichArray.push(Zürich);

    return date;
  });

  res.status(StatusCodes.OK).json({
    title: "Car Wash",
    labels: [...dates],
    data: [
      {
        name: "Dietlikon",
        type: "line",
        fill: "solid",
        data: dietlikonArray,
      },
      {
        name: "Kloten",
        type: "line",
        fill: "solid",
        data: klotenArray,
      },
      {
        name: "Zurich",
        type: "line",
        fill: "solid",
        data: zürichArray,
      },
    ],
  });
};

export const carTransferStats = async (req, res) => {
  let carTransfer = await CarTransfer.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(moment().subtract(7, "days")),
          $lte: new Date(),
        },
      },
    },
    { $group: { _id: "$transferType", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  carTransfer = carTransfer.map((item) => {
    const { _id: label, count: value } = item;

    return { label, value };
  });
  res.status(StatusCodes.OK).json({
    title: "Car Transfer",
    carTransfer,
  });
};
