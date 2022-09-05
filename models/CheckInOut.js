import mongoose from "mongoose";
import validator from "validator";

const CheckInOut = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: [true, "Please provide user"],
    },
    startTime: {
      type: Date,
      required: [true, "Please provide start time"],
    },
    startTimeLocation: {
      type: Object,
    },
    endTime: {
      type: Date,
    },
    endTimeLocation: {
      type: Object,
    },
    breaks: {
      type: Array,
    },
    active: {
      type: Boolean,
    },
    attempt: {
      type: String,
    },
    description: {
      type: String,
    },
    hours: {
      type: String,
    },
    paid: {
      type: Boolean,
      default: false,
    },
    dailySalary: {
      type: Number,
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

export default mongoose.model("ChekInOut", CheckInOut);
