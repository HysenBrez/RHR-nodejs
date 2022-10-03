import express from "express";

import {
  createPayroll,
  getPayrolls,
  deletePayroll,
} from "../controllers/payrollController.js";

const router = express.Router();

router.route("/").post(createPayroll).get(getPayrolls);
router.route("/:id").delete(deletePayroll);

export default router;
