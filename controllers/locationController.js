import Location from "../models/Location.js";
import moment from "moment";
import mongoose from "mongoose";
import { BadRequestError, NotFoundError } from "../errors/index.js";
import { StatusCodes } from "http-status-codes";
import { adminPermissions } from "../utils/checkPermissions.js";

export const locationByAdmin = async (req, res) => {
  adminPermissions(req.user);

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
  const { locationType, deleted } = req.query;

  let queryObject = {
    $expr: {
      $or: [{ $eq: [{ $type: "$deletedAt" }, "missing"] }, { $eq: ["$deletedAt", null] }],
    },
  };

  if (deleted == "true") queryObject = { deletedAt: { $ne: null } };

  if (locationType) queryObject.locationType = locationType;

  console.log(queryObject);

  const locations = await Location.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "locationId",
        as: "users",
      },
    },
    { $addFields: { usersCount: { $size: "$users" } } },
    { $match: { ...queryObject } },
    { $sort: { locationName: 1 } },
    { $project: { users: 0 } },
  ]);

  const totalLocations = locations.length;

  if (!locations.length) throw new NotFoundError("Not found locations.");

  res.status(StatusCodes.OK).json({ locations, totalLocations });
};

export const getAllNameLocationsByAdmin = async (req, res) => {
  // adminPermissions(req.user);

  let result = Location.find({ deletedAt: null }, "locationName locationType");

  result = result.sort({ locationName: 1 });

  const locations = await result;

  if (!locations) throw new NotFoundError("Locations not found.");

  const totalLocations = locations.length;

  res.status(StatusCodes.OK).json({ locations, totalLocations });
};

export const updateLocationByAdmin = async (req, res) => {
  adminPermissions(req.user);

  const { locationName, locationType, carType } = req.body;

  if (!locationName || !locationType || !carType)
    throw new BadRequestError("Please provide all values");

  const location = await Location.findOneAndUpdate(
    { _id: req.params.id },
    { locationName, locationType, carType },
    { new: true }
  );

  if (!location) throw new NotFoundError("Not found location");

  res.status(200).json(location);
};

export const deleteLocationByAdmin = async (req, res) => {
  adminPermissions(req.user);

  const { id } = req.params;

  const location = await Location.findOne({ _id: id, deletedAt: "" });

  if (!location) throw new NotFoundError("Location not found.");

  location.deletedAt = new Date().toISOString();

  await location.save();

  res.status(StatusCodes.OK).json({ msg: "Location successfully has been deleted." });
};

export const restoreLocation = async (req, res) => {
  adminPermissions(req.user);

  const { id } = req.params;

  const location = await Location.findOne({ _id: id, deletedAt: { $ne: "" } });

  if (!location) throw new NotFoundError("Location not found.");

  location.deletedAt = "";

  await location.save();

  res.status(StatusCodes.OK).json({ msg: "Location has been restored." });
};

export const deleteLocationPermanently = async (req, res) => {
  adminPermissions(req.user);

  const { id } = req.params;

  const location = await Location.deleteOne({ _id: id, deletedAt: { $ne: "" } });

  if (!location.deletedCount) throw new NotFoundError("Location Not Found.");

  res.status(StatusCodes.OK).json({ msg: "The location has been deleted permanently." });
};
