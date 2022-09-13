import mongoose from "mongoose";
import validator from "validator";

const CarTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide car type name"],
  },
  wash: {
    outside: {
      type: String,
    },
    inside: {
      type: String,
    },
    outInside: {
      type: String,
    },
    motorrad: {
      type: String,
    },
    turnaround: {
      type: String,
    },
    quickTurnaround: {
      type: String,
    },
  },
  transfer: {
    hzp: {
      type: String,
    },
    hbp: {
      type: String,
    },
    apdt: {
      type: String,
    },
    base: {
      type: String,
    },
    perkm: {
      type: String,
    },
  },
});

const Location = new mongoose.Schema(
  {
    locationName: {
      type: String,
      required: [true, "Please provide location name"],
    },
    locationType: {
      type: String,
      enum: ["noTransfer", "withTransfer"],
      required: [true, "Please provie location type"],
    },
    carType: {
      type: [CarTypeSchema],
      default: undefined,
      required: [true, "Please provide car type"],
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Location", Location);
