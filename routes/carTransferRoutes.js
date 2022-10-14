import express from "express";
const router = express.Router();

import {
  carTransfer,
  getCarTransfer,
  getCarsTransferByUser,
  getCarsTransferByLocation,
  updateCarTransfer,
  deleteCarTransfer,
  updateCarTransferSuspect,
  getExcel,
} from "../controllers/carTransferController.js";

router.route("/admin/:id").get(getCarsTransferByLocation);

router.route("/get-excel").get(getExcel);

router.route("/").post(carTransfer);
router.route("/user/:id").get(getCarsTransferByUser);

router.route("/:id").get(getCarTransfer).patch(updateCarTransfer).delete(deleteCarTransfer);

router.route("/:carTransferId/suspect").patch(updateCarTransferSuspect);

export default router;
