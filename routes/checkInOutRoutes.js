import express from "express";
const router = express.Router();

import {
  checkIn,
  checkOut,
  getCheckInsByUser,
  checkForDate,
  checkInDescription,
  checkInByAdmin,
  getAllCheckIns,
  deleteCheckInByAdmin,
  updateCheckInByAdmin,
  getCheckIn,
} from "../controllers/checkInOutController.js";

router.route("/admin").post(checkInByAdmin).get(getAllCheckIns);

router
  .route("/admin/:id")
  .patch(updateCheckInByAdmin)
  .delete(deleteCheckInByAdmin);

router.route("/").post(checkIn).patch(checkOut);
router.route("/:id").get(getCheckIn);
router.route("/user/:id").get(getCheckInsByUser);
router.route("/:id/date").get(checkForDate);
router.route("/description").patch(checkInDescription);

export default router;
