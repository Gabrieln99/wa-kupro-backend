import express from "express";
import cors from "cors";
import connectToDatabase from "./databaseConnector.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Spajanje na bazu
await connectToDatabase();

// Test ruta
app.get("/", (req, res) => {
  res.json({ message: "Backend is running" });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
