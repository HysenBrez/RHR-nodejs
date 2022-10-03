import mongoose from "mongoose";
import moment from "moment";

const BreakSchema = new mongoose.Schema({
  startBreak: {
    type: Date,
  },
  endBreak: {
    type: Date,
  },
  active: {
    type: Boolean,
  },
});

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
      default: function () {
        const date = moment(this.startTime).set({ h: 23, m: 59, s: "00" });
        return date;
      },
    },
    endTimeLocation: {
      type: Object,
    },
    breaks: {
      type: [BreakSchema],
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
    workHoursInMins: {
      type: Number,
    },
    dailySalary: {
      type: Number,
    },
    paid: {
      type: Boolean,
      default: false,
    },
    suspect: {
      type: Boolean,
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

CheckInOut.pre("save", async function () {
  if (!this.isModified("endTime")) return;

  this.suspect = false;
});

export default mongoose.model("ChekInOut", CheckInOut);
