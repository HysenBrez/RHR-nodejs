import express from "express";

const router = express.Router();

import { totalStats, carWashStats, carTransferStats } from "../controllers/dashboardController.js";

router.route("/stats").get(totalStats);
router.route("/stats/car-wash").get(carWashStats);
router.route("/stats/car-transfer").get(carTransferStats);

export default router;
