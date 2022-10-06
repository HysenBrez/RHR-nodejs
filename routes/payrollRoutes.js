import express from "express";

import {
  checkUsersForPayroll,
  createPayroll,
  getPayrolls,
  deletePayroll,
} from "../controllers/payrollController.js";

const router = express.Router();

router.route("/check").get(checkUsersForPayroll);
router.route("/").post(createPayroll).get(getPayrolls);
router.route("/:id").delete(deletePayroll);

export default router;
