import express from "express";
const router = express.Router();

import {
  carWash,
  getCarsWashByLocation,
  updateCarWash,
  getCarWash,
  getCarsWashByUser,
  deleteCarWash,
  updateCarWashSuspect,
  getExcel,
} from "../controllers/carWashController.js";

router.route("/admin/:id").get(getCarsWashByLocation);

router.route("/get-excel").get(getExcel);

router.route("/").post(carWash);
router.route("/user/:id").get(getCarsWashByUser);
router.route("/:id").get(getCarWash).patch(updateCarWash).delete(deleteCarWash);

router.route("/:carWashId/suspect").patch(updateCarWashSuspect);

export default router;
