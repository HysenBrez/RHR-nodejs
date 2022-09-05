import mongoose from "mongoose";
import validator from "validator";

// const CarTypeSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: [true, "Please provide car type name"],
//   },
//   outside: {
//     type: String,
//     required: [
//       function () {
//         return this.name !== "Motorrad";
//       },
//       "Please provide outside wash price",
//     ],
//   },
//   inside: {
//     type: String,
//     required: [
//       function () {
//         return this.name !== "Motorrad";
//       },
//       "Please provide inside wash price",
//     ],
//   },
//   outInside: {
//     type: String,
//     required: [
//       function () {
//         return this.name !== "Motorrad";
//       },
//       "Please provide outInside wash price",
//     ],
//   },
//   motorrad: {
//     type: String,
//     required: [
//       function () {
//         return this.name === "Motorrad";
//       },
//       "Please provide motorrad wash price",
//     ],
//   },
//   hzp: {
//     type: String,
//     required: [
//       function () {
//         return this.parent().locationType === "withTransfer";
//       },
//       "Please provide HZP price",
//     ],
//   },
//   hbp: {
//     type: String,
//     required: [
//       function () {
//         return this.parent().locationType === "withTransfer";
//       },
//       "Please provide HBP price",
//     ],
//   },
//   apdt: {
//     type: String,
//     required: [
//       function () {
//         return this.parent().locationType === "withTransfer";
//       },
//       "Please provide AP-DT price",
//     ],
//   },
//   base: {
//     type: String,
//     required: [
//       function () {
//         return this.parent().locationType === "withTransfer";
//       },
//       "Please provide base price",
//     ],
//   },
//   perkm: {
//     type: String,
//     required: [
//       function () {
//         return this.parent().locationType === "withTransfer";
//       },
//       "Please provide per/km price",
//     ],
//   },
// });

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
