import { StatusCodes } from "http-status-codes";
import moment from "moment";
import nodemailer from "nodemailer";
import cron from "node-cron";

import User from "../models/User.js";
import { BadRequestError, NotFoundError } from "../errors/index.js";
import { adminPermissions } from "../utils/checkPermissions.js";
import CheckInOut from "../models/CheckInOut.js";
import CarWash from "../models/CarWash.js";
import CarTransfer from "../models/CarTransfer.js";
import { addDays } from "../utils/helpers.js";

export const createUser = async (req, res) => {
  const { firstName, lastName, email, password, role, locationId } = req.body;

  if (!firstName || !lastName || !email || !password || !locationId)
    throw new BadRequestError("Please provide all values");

  const checkEmail = await User.findOne({ email });
  if (checkEmail) throw new BadRequestError("Email already in use");

  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    role,
    locationId,
    active: true,
  });
  const token = user.createJWT();

  res.status(201).json({
    user: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      locationId: user.locationId,
    },
    token,
  });
};

export const getUser = async (req, res) => {
  const { id } = req.params;

  const user = await User.findOne({ _id: id });

  if (!user) throw new NotFoundError("Not found user");

  res.status(200).json({ ...user._doc, active: user.active ? "active" : "Inactive" });
};

export const getAllUsers = async (req, res) => {
  const { active, search, sort, sortBy } = req.query;

  let queryObject = {
    active: true,
    deletedAt: "",
  };

  // if (all) queryObject.active = { $in: [true, false] };

  if (search) {
    queryObject = {
      $or: [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ],
    };
  }

  if (active == "false") queryObject.active = false;

  let result = User.find(queryObject)
    .collation({ locale: "en" })
    .populate("locationId", ["_id", "locationName"]);

  result = result.sort({ firstName: 1 });

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  result = result.skip(skip).limit(limit);

  const users = await result;

  const totalUsers = await User.countDocuments(queryObject);
  const numOfPages = Math.ceil(totalUsers / limit);

  res.status(StatusCodes.OK).json({ users, totalUsers, numOfPages });
};

export const updateUser = async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    description,
    role,
    locationId,
    active,
    street,
    postalCode,
    place,
    hourlyPay,
  } = req.body;

  const { id } = req.params;

  if (!id || !firstName || !lastName || !email || !locationId)
    throw new BadRequestError("Please provide all values");

  const user = await User.findOne({ _id: id });

  user.firstName = firstName;
  user.lastName = lastName;
  user.email = email;
  user.phone = phone;
  user.street = street;
  user.postalCode = postalCode;
  user.place = place;
  user.description = description;
  user.role = role;
  user.hourlyPay = hourlyPay;
  user.locationId = locationId;
  user.active = active == "Inactive" ? false : true;

  await user.save();

  const token = user.createJWT();

  res.status(StatusCodes.OK).json({ user, token, msg: "User has been updated." });
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const { id: userId } = req.params;

  if (!userId || !newPassword || !confirmPassword)
    throw new BadRequestError("Please provide all values");

  if (newPassword !== confirmPassword)
    throw new BadRequestError("New password and confirm password must be the same.");

  const user = await User.findOne({ _id: userId }).select("+password");

  if (req.user.role !== "admin") {
    const isPasswordCorrect = await user.comparePassword(currentPassword);
    if (!isPasswordCorrect) throw new BadRequestError("Current password is incorrect");
  }

  user.password = newPassword;

  await user.save();

  res.status(StatusCodes.OK).json({ userId, msg: "Password changed successfully", user });
};

export const deleteUser = async (req, res) => {
  adminPermissions(req.user);

  const { id } = req.params;

  if (!id) throw new BadRequestError("Please provide all values");

  const user = await User.findOne({ _id: id, deletedAt: "" });

  if (!user) throw new NotFoundError("Not found user.");

  user.deletedAt = new Date().toISOString();

  await user.save();

  res.status(StatusCodes.OK).json({ msg: "Success! User Removed." });
};

export const restoreUser = async (req, res) => {
  adminPermissions(req.user);

  const { id } = req.params;

  if (!id) throw new BadRequestError("Please provide all values");

  const user = await User.findOne({ _id: id, deletedAt: { $ne: "" } });

  if (!user) throw new NotFoundError("Not found user.");

  user.deletedAt = "";

  await user.save();

  res.status(StatusCodes.OK).json({ msg: "The user has been restored successfully." });
};

export const deleteUserPermanently = async (req, res) => {
  adminPermissions(req.user);

  const { id } = req.params;

  if (!id) throw new BadRequestError("Please provide all values");

  const user = await User.deleteOne({ _id: id, deletedAt: { $ne: "" } });

  console.log(user);
  if (!user.deletedCount) throw new NotFoundError("Not found user.");

  res.status(StatusCodes.OK).json({ msg: "The user has been deleted permanently." });
};

export const sendEmail = async (req, res) => {
  const { name, email, pdfBase64 } = req.body;

  const content = Buffer.from(pdfBase64, "base64");

  let mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Lohnabrechnung - ${name}`,
    html: `<!doctype html>
    <html>
      <head>
      </head>
      <body>
        Pershendetje <b>${name}, </b> <br>
        Te bashkangjitur gjeni Lohnabrechnung.
      </body>
    </html>`,
    attachments: [{ filename: `Lohnabrechnung - ${name}.pdf`, content }],
  };

  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) console.log(error);
    res.status(StatusCodes.OK).json({ msg: `Email sent: ${info.response}` });
  });

  // cron.schedule("*/10 * * * * *", () => {
  //   // Send e-mail
  //   transporter.sendMail(mailOptions, function (error, info) {
  //     if (error) {
  //       console.log(error);
  //     } else {
  //       console.log("Email sent: " + info.response);
  //     }
  //   });
  // });
};

export const getExcelFile = async (req, res) => {
  adminPermissions(req.user);

  const { search, type, from, to, locationId, userId } = req.query;

  // if (!type || !from || !to)
  if (!type) throw new BadRequestError("Please provide all values");

  const queryObject = {};

  if (search) {
    queryObject.licensePlate = { $regex: search, $options: "i" };
  }

  if (from)
    queryObject.createdAt = {
      $gte: new Date(from),
    };

  if (to)
    queryObject.createdAt = {
      $lte: addDays(to),
    };

  if (from && to)
    queryObject.createdAt = {
      $gte: new Date(from),
      $lt: addDays(to),
    };

  if (locationId) queryObject.locationId = locationId;

  if (userId) queryObject.userId = userId;

  let result, totalData;

  if (type === "wash") {
    result = CarWash.find(queryObject, " -_id -specialPrice -createdBy -updatedAt -__v")
      .populate("userId", ["firstName", "lastName"])
      .populate("locationId", ["locationName", "locationType"]);

    totalData = await CarWash.countDocuments(queryObject);
  }

  if (type === "transfer") {
    result = CarTransfer.find(queryObject, " -_id -specialPrice -createdBy -updatedAt -__v")
      .populate("userId", ["firstName", "lastName"])
      .populate("locationId", ["locationName", "locationType"]);

    totalData = await CarTransfer.countDocuments(queryObject);
  }

  result = result.sort({ createdAt: -1 });

  let data = await result;

  const washTypesNames = {
    outside: "Aussenreinigung",
    inside: "Innenreinigung",
    outInside: "Kombipaket",
    motorrad: "Motorrad wäsche",
    turnaround: "Turnaround",
    quickTurnaround: "Quick Turnaround",
    special: "Spezial",
  };

  const transferTypesNames = {
    hzp: "HZP",
    hbp: "HBP",
    apdt: "AP-DT",
    presumptive: "Transfer KM",
  };

  data = data.map((item) => {
    const {
      licensePlate,
      userId: { firstName, lastName },
      locationId: { locationName },
      carType,
      washType,
      transferType,
      finalPrice,
      createdAt,
    } = item;

    return {
      licensePlate,
      user: `${firstName} ${lastName}`,
      location: locationName,
      carType,
      washType: washTypesNames[washType],
      transferType: transferTypesNames[transferType],
      finalPrice,
      createdAt: moment(createdAt).format("YYYY-MM-DD H:mm"),
    };
  });

  if (!data) throw new NotFoundError("Not found data!");

  res.status(StatusCodes.OK).json({ data, totalData });
};
