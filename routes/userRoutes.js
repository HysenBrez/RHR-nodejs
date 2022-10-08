import express from "express";

const router = express.Router();

import {
  createUser,
  getUser,
  getAllUsers,
  updateUser,
  changePassword,
  deleteUser,
  restoreUser,
  deleteUserPermanently,
  sendEmail,
  getExcelFile,
} from "../controllers/userController.js";

router.route("/get-excel").get(getExcelFile);

router.route("/").post(createUser).get(getAllUsers);
router.route("/:id").get(getUser).patch(updateUser).delete(deleteUser);
router.route("/:id/restore").patch(restoreUser);
router.route("/:id/permanently").delete(deleteUserPermanently);
router.route("/:id/change-password").patch(changePassword); // should check again

router.route("/send-email").post(sendEmail);

export default router;
