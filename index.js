import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectToDatabase from "./databaseConnector.js";
import userRoutes from "./users.js";
import productRoutes from "./products.js";
import imageRoutes from "./imageRoutes.js";

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://kupro.netlify.app",
      process.env.FRONTEND_URL,
    ].filter(Boolean), // Remove any undefined values
    credentials: true,
  })
);
app.use(express.json());

// Connect to database
await connectToDatabase();

// Routes
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/images", imageRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "KuPro Backend API is running",
    version: "1.0.0",
    endpoints: {
      users: "/api/users",
      products: "/api/products",
      images: "/api/images",
    },
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 KuPro Backend server is running on port ${PORT}`);
  console.log(
    `📍 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:5173"}`
  );
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
});
