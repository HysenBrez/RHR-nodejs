import express from "express";

const router = express.Router();

import {
  createUser,
  getUser,
  getAllUsers,
  updateUser,
  changePassword,
  deleteUser,
  sendEmail,
  getExcelFile,
} from "../controllers/userController.js";

router.route("/get-excel").get(getExcelFile);

router.route("/").post(createUser).get(getAllUsers);
router.route("/:id").get(getUser).patch(updateUser).delete(deleteUser);
router.route("/:id/change-password").patch(changePassword);

router.route("/send-email").post(sendEmail);

export default router;
