import express from "express";
import fileUpload from "express-fileupload";
import dotenv from "dotenv";
import cors from "cors";
import "express-async-errors";

const app = express();
dotenv.config();

// db and authenticate
import connectDB from "./db/connect.js";

// routers
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import checkInOut from "./routes/checkInOutRoutes.js";
import location from "./routes/locationRoutes.js";
import carWash from "./routes/carWashRoutes.js";
import carTransfer from "./routes/carTransferRoutes.js";
import payroll from "./routes/payrollRoutes.js";
import todayPlanRoutes from "./routes/todayPlanRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

// middleware
import authMiddleware from "./middleware/authMiddleware.js";
import notFoundMiddleware from "./middleware/notFoundMiddleware.js";
import errorHandlerMiddleware from "./middleware/errorHandlerMiddleware.js";

app.use(express.json());
app.use(fileUpload());

app.use(cors());

// routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", authMiddleware, userRoutes);
app.use("/api/v1/check-in-out", authMiddleware, checkInOut);
app.use("/api/v1/location", authMiddleware, location);
app.use("/api/v1/car-wash", authMiddleware, carWash);
app.use("/api/v1/car-transfer", authMiddleware, carTransfer);
app.use("/api/v1/payroll", authMiddleware, payroll);
app.use("/api/v1/today-plan", authMiddleware, todayPlanRoutes);
app.use("/api/v1/dashboard", authMiddleware, dashboardRoutes);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB(process.env.MONGO_URL);
    app.listen(PORT, () => {
      console.log(`Server is listing on port ${PORT}...`);
    });
  } catch (error) {
    console.log(error);
  }
})();
