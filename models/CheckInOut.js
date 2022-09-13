import mongoose from "mongoose";

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
        return new Date(
          new Date(this.startTime).getTime() + 60 * 60 * 24 * 1000 - 60000
        );
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
