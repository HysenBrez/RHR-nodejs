import express from "express";

const router = express.Router();

import {
  createTodayPlan,
  getTodayPlan,
  updateTodayPlan,
} from "../controllers/todayPlanController.js";

router.route("/").post(createTodayPlan).get(getTodayPlan);

router.route("/:id").patch(updateTodayPlan);

export default router;
