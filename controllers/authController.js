import User from "../models/User.js";
import { BadRequestError, UnAuthenticatedError } from "../errors/index.js";
import { StatusCodes } from "http-status-codes";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

export const register = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password)
    throw new BadRequestError("Please provide all values.");

  const userAlreadyExists = await User.findOne({ email });
  if (userAlreadyExists) throw new BadRequestError("Email already in use.");

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

  if (!email || !password) throw new BadRequestError("Please provide all values.");

  const user = await User.findOne({ email }).select("+password");
  if (!user) throw new UnAuthenticatedError("Invalid Credentials.");

  if (!user.active) throw new UnAuthenticatedError("User is not active.");

  const checkPassword = await user.comparePassword(password);
  if (!checkPassword) throw new UnAuthenticatedError("Invalid Credentials.");

  const token = user.createJWT();
  user.password = undefined;
  res.status(200).json({ user, token });
};

export const resetPasswordLink = async (req, res) => {
  const { email } = req.body;

  if (!email) throw new BadRequestError("Please provide your email address.");

  const salt = await bcrypt.genSalt(20);

  const user = await User.findOneAndUpdate({ email }, { resetToken: salt });

  if (!user) throw new BadRequestError("The email is not valid.");

  let mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Reset Password | RHR Car Care`,
    html: `<!doctype html>
    <html>
      <head>
      </head>
      <body>
        Hi <b>${user.firstName} ${user.lastName}, </b> <br>
        Click button to reset your password. <br>
        <p style="width: 150px; margin: 10px 0px; font-weight: 700; line-height: 2; border-radius: 8px; background-color: #2065d1; text-align: center"> 
         <a href="https://app.rhr-carcare.ch/reset-password?email=${email}&token=${salt}" style="display: block; padding: 6px 16px; color: #fff; text-decoration: none;"> Reset Link </a>
        </p>
      </body>
    </html>`,
  };

  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) return res.status(StatusCodes.BAD_REQUEST).json({ error });
  });

  res.status(StatusCodes.OK).json({ msg: "Reset password link sent successfully." });
};

export const resetPassword = async (req, res) => {
  const { email, token, newPassword, confirmPassword } = req.body;
  if (!email || !token || !newPassword || !confirmPassword)
    throw new BadRequestError("Please provide all values.");

  if (newPassword !== confirmPassword)
    throw new BadRequestError("New password and confirm password must be the same.");

  const user = await User.findOne({ email, resetToken: token });

  if (!user) throw new BadRequestError("Link is not valid.");

  user.password = newPassword;
  user.resetToken = null;

  await user.save();

  res.status(StatusCodes.OK).json({ msg: "Password changed successfully." });
};
