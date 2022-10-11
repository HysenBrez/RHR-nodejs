import express from "express";

const router = express.Router();

import { totalStats } from "../controllers/dashboardController.js";

router.route("/stats").get(totalStats);

export default router;
