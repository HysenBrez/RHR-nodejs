import mongoose from "mongoose";

const Payroll = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: [true, "Please provide user"],
    },
    employer: {
      name: { type: String },
      street: { type: String },
      plz: { type: String },
    },
    worker: {
      name: { type: String },
      street: { type: String },
      plz: { type: String },
      ahv: { type: String },
    },
    monthYear: {
      type: String,
    },
    placeDate: {
      type: String,
    },
    canton: {
      type: String,
    },
    billingProcedure: {
      type: String,
    },
    totalHours: {
      type: Number,
    },
    hourlyPay: {
      type: Number,
    },
    holidayBonus: {
      type: Number,
    },
    hourlyPayGross: {
      type: Number,
    },
    grossSalary: {
      type: Number,
    },
    hourlyDeduction: {
      type: Number,
    },
    monthlyDeduction: {
      type: Number,
    },
    monthlyPay: {
      type: Number,
    },
    taxes: {
      type: Object,
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: [true, "Please provide user"],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Payroll", Payroll);
