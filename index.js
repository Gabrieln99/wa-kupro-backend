import express from "express";
import cors from "cors";
import connectToDatabase from "./databaseConnector.js";
import userRoutes from "./users.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Spajanje na bazu
await connectToDatabase();

// Routes
app.use("/api/users", userRoutes);
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// Test ruta
app.get("/", (req, res) => {
  res.json({ message: "Backend is running" });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
