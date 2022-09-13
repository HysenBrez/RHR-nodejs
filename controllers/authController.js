import User from "../models/User.js";
import { BadRequestError, UnAuthenticatedError } from "../errors/index.js";

export const register = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password)
    throw new BadRequestError("Please provide all values");

  const userAlreadyExists = await User.findOne({ email });
  if (userAlreadyExists) throw new BadRequestError("Email already in use");

  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    active: true,
    role: "user",
  });
  const token = user.createJWT();

  res.status(201).json({
    user: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    },
    token,
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    throw new BadRequestError("Please provide all values");

  const user = await User.findOne({ email }).select("+password");
  if (!user) throw new UnAuthenticatedError("Invalid Credentials");

  if (!user.active) throw new UnAuthenticatedError("User is not active");

  const checkPassword = await user.comparePassword(password);
  if (!checkPassword) throw new UnAuthenticatedError("Invalid Credentials");

  const token = user.createJWT();
  user.password = undefined;
  res.status(200).json({ user, token });
};
