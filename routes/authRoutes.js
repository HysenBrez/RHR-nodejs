import express from "express";

const router = express.Router();

import {
  register,
  login,
  resetPasswordLink,
  resetPassword,
} from "../controllers/authController.js";

router.route("/register").post(register);
router.route("/login").post(login);

router.route("/reset-password/link").patch(resetPasswordLink);
router.route("/reset-password").patch(resetPassword);

export default router;
