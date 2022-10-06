import mongoose from "mongoose";
import validator from "validator";

const CarWash = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: [true, "Please provide user"],
    },
    licensePlate: {
      type: String,
      required: [true, "Please provide license plate"],
    },
    locationId: {
      type: mongoose.Types.ObjectId,
      ref: "Location",
      required: [true, "Please provide location id"],
    },
    carType: {
      type: String,
      required: [true, "Please provide car type"],
    },
    washType: {
      type: String,
      required: [true, "Please provide wash type"],
    },
    specialPrice: {
      type: String,
      required: [
        function () {
          return this.washType === "Special";
        },
        "Please provide special price",
      ],
    },
    finalPrice: {
      type: Number,
    },
    suspect: {
      type: Boolean,
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

export default mongoose.model("CarWash", CarWash);
