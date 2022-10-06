import mongoose from "mongoose";

const TodayPlanSchema = new mongoose.Schema(
  {
    users: {
      type: Object,
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: [true, "Please provide user"],
    },
  },
  { timestamps: true }
);

export default mongoose.model("TodayPlan", TodayPlanSchema);
