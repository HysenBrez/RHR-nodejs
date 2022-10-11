import express from "express";
const router = express.Router();

import {
  locationByAdmin,
  getLocation,
  getAllLocations,
  getAllNameLocationsByAdmin,
  updateLocationByAdmin,
  deleteLocationByAdmin,
  restoreLocation,
  deleteLocationPermanently,
} from "../controllers/locationController.js";

router.route("/admin").post(locationByAdmin).get(getAllNameLocationsByAdmin);

router.route("/").get(getAllLocations);
router.route("/:id").get(getLocation);

router.route("/admin/:id").patch(updateLocationByAdmin).delete(deleteLocationByAdmin);

router.route("/:id/restore").patch(restoreLocation);
router.route("/:id/permanently").delete(deleteLocationPermanently);

export default router;
