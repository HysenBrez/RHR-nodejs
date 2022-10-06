import moment from "moment";
import { StatusCodes } from "http-status-codes";

import TodayPlan from "../models/TodayPlan.js";
import BadRequestError from "../errors/bad-request.js";

export const createTodayPlan = async (req, res) => {
  const { users } = req.body;
  const { userId: createdBy } = req.user;

  if (!users) throw new BadRequestError("Please provide all values");

  await TodayPlan.create({ users, createdBy });

  res.status(StatusCodes.CREATED).json({ users, msg: "Today Plan has been created successfully." });
};

export const getTodayPlan = async (req, res) => {
  let todayPlan = (await TodayPlan.find({}).populate("createdBy", ["firstName", "lastName"]))[0];

  const {
    _id,
    users,
    createdBy: { firstName, lastName },
    updatedAt,
  } = todayPlan;

  todayPlan = {
    _id,
    users,
    createdBy: `${firstName} ${lastName}`,
    lastModified: moment(updatedAt).format("DD MMMM, hh:mm"),
  };

  res.status(StatusCodes.OK).json({ todayPlan });
};

export const updateTodayPlan = async (req, res) => {
  const {
    params: { id: _id },
    body: { users },
    user: { userId: createdBy },
  } = req;

  if (!_id || !users) throw new BadRequestError("Please provide all values");

  await TodayPlan.findOneAndUpdate({ _id }, { users, createdBy });

  res.status(StatusCodes.OK).json({ users, msg: "Today Plan has been updated successfully." });
};

// export const deleteTodayPlan = async (req, res) => {};
