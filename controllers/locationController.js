import Location from "../models/Location.js";
import moment from "moment";
import mongoose from "mongoose";
import {
  BadRequestError,
  NotFoundError,
  UnAuthenticatedError,
} from "../errors/index.js";
import { StatusCodes } from "http-status-codes";
import checkPermissions from "../utils/checkPermissions.js";

export const locationByAdmin = async (req, res) => {
  checkPermissions(req.user);

  const { locationName, locationType, carType } = req.body;

  if (!locationName || !locationType || !carType) {
    throw new BadRequestError("Please provide all values");
  }

  const location = await Location.create({
    locationName,
    locationType,
    carType,
    createdBy: req.user.userId,
  });

  res.status(201).json(location);
};

export const getLocation = async (req, res) => {
  const { id } = req.params;

  const location = await Location.findOne({ _id: id });

  if (!location) {
    throw new NotFoundError(`Not found location`);
  }

  res.status(200).json(location);
};

export const getAllLocations = async (req, res) => {
  // let result = Location.find();

  // result = result.sort({ locationName: 1 });

  // const page = Number(req.query.page) || 1;
  // const limit = 10;
  // const skip = (page - 1) * limit;
  // result = result.skip(skip).limit(limit);

  // const locations = await result;

  // if (!locations) {
  //   throw new NotFoundError("Not found locations");
  // }

  const locations = await Location.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "locationId",
        as: "users",
      },
    },
    {
      $addFields: {
        usersCount: { $size: "$users" },
      },
    },
    {
      $sort: {
        locationName: 1,
      },
    },
  ]);

  const totalLocations = locations.length;
  // const totalLocations = await Location.countDocuments();
  const numOfPages = Math.ceil(totalLocations / 3);
  res.status(StatusCodes.OK).json({ locations, totalLocations, numOfPages });
};

export const getAllNameLocationsByAdmin = async (req, res) => {
  checkPermissions(req.user);

  let result = Location.find({}, "locationName locationType");

  result = result.sort({ locationName: 1 });

  const locations = await result;

  if (!locations) {
    throw new NotFoundError("Not found locations");
  }

  const totalLocations = locations.length;

  res.status(StatusCodes.OK).json({ locations, totalLocations });
};

export const updateLocationByAdmin = async (req, res) => {
  checkPermissions(req.user);

  const { locationName, locationType, carType } = req.body;

  if (!locationName || !locationType || !carType)
    throw new BadRequestError("Please provide all values");

  const location = await Location.findOneAndUpdate(
    { _id: req.params.id },
    { locationName, locationType, carType },
    { new: true }
  );

  if (location == null) throw new NotFoundError("Not found location");

  res.status(200).json(location);
};

export const deleteLocationByAdmin = async (req, res) => {
  checkPermissions(req.user);

  const { id } = req.params;

  const location = Location.find({ _id: id });

  if (!location) throw new NotFoundError("Not found location");

  await Location.deleteOne({ _id: id });

  res.status(StatusCodes.OK).json({ msg: "Location successfully removed" });
};
