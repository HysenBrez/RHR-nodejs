import express from "express";
const router = express.Router();

import {
  locationByAdmin,
  getLocation,
  getAllLocations,
  getAllNameLocationsByAdmin,
  updateLocationByAdmin,
  deleteLocationByAdmin,
} from "../controllers/locationController.js";

router.route("/admin").post(locationByAdmin).get(getAllNameLocationsByAdmin);

router.route("/").get(getAllLocations);
router.route("/:id").get(getLocation);

router
  .route("/admin/:id")
  .patch(updateLocationByAdmin)
  .delete(deleteLocationByAdmin);

export default router;
