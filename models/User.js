import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const UserSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "Please provide Firstname"],
      minlength: 3,
      maxlength: 20,
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Please provide Lastname"],
      minlength: 3,
      maxlength: 20,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please provide email"],
      validate: {
        validator: validator.isEmail,
        message: "Please provide a valid email",
      },
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Please provide password"],
      minlength: 6,
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
      default: "",
    },
    street: {
      type: String,
      maxlength: 100,
    },
    postalCode: {
      type: String,
      maxlength: 100,
    },
    place: {
      type: String,
      maxlength: 100,
    },
    ahv: {
      type: String,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 1000,
      default: "...",
    },
    role: {
      type: String,
      enum: {
        values: ["user", "accountant", "manager", "admin"],
        message: "The role type is not valid.",
      },
      required: [true, "Please provide role"],
    },
    hourlyPay: {
      type: Number,
      default: 0,
    },
    locationId: {
      type: mongoose.Types.ObjectId,
      ref: "Location",
    },
    active: {
      type: Boolean,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.createJWT = function () {
  return jwt.sign(
    { userId: this._id, role: this.role, hourlyPay: this.hourlyPay },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_LIFETIME }
  );
};

UserSchema.methods.comparePassword = async function (candidatePassword) {
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  return isMatch;
};

export default mongoose.model("User", UserSchema);
