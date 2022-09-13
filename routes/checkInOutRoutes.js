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
  deleteCheckInAdmin,
  updateCheckInAdmin,
  getCheckIn,
  startBreak,
  endBreak,
  getExcelFile,
} from "../controllers/checkInOutController.js";

router.route("/admin").post(checkInByAdmin).get(getAllCheckIns);
router.route("/admin/:id").patch(updateCheckInAdmin).delete(deleteCheckInAdmin);

router.route("/start-break").patch(startBreak);
router.route("/end-break").patch(endBreak);

router.route("/excel").get(getExcelFile);

router.route("/").post(checkIn).patch(checkOut);
router.route("/:id").get(getCheckIn);
router.route("/user/:userId").get(getCheckInsByUser);
router.route("/:userId/date").get(checkForDate);
router.route("/description").patch(checkInDescription);

export default router;
