import mongoose from "mongoose";
import validator from "validator";

const CarTransfer = new mongoose.Schema(
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
    transferMethod: {
      type: String,
      enum: {
        values: ["collection", "delivery"],
        message: "The transfer method is not valid.",
      },
      required: [true, "Please provide transfer method"],
    },
    transferType: {
      type: String,
      required: [true, "Please provide transfer type"],
    },
    transferDistance: {
      type: String,
      required: [
        function () {
          return this.transferType === "Presumptive";
        },
        "Please provide transfer distance",
      ],
    },
    finalPrice: {
      type: String,
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

export default mongoose.model("CarTransfer", CarTransfer);
