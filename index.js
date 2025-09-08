import express from "express";
import cors from "cors";
import connectToDatabase from "./databaseConnector.js";
import userRoutes from "./users.js";
import mongoose from "mongoose";

const app = express();

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// Spajanje na bazu
await connectToDatabase();

// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  image: { type: String, required: true },
  currentPrice: { type: Number, required: true },
  originalPrice: { type: Number },
  color: { type: String },
  stock: { type: Number, default: 1 },
  description: { type: String, default: "Opis proizvoda." },
  isBidding: { type: Boolean, default: false },
  bestBidder: { type: String, default: null },
  userId: { type: String },
  userEmail: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const Product = mongoose.model("Product", productSchema);

// Routes
app.use("/api/users", userRoutes);

// Product routes
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching products", error: error.message });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    const {
      name,
      category,
      image,
      currentPrice,
      originalPrice,
      color,
      stock,
      description,
      isBidding,
      userId,
      userEmail,
    } = req.body;

    // Basic validation
    if (!name || !category || !image || !currentPrice || !description) {
      return res.status(400).json({
        message: "Sva obavezna polja moraju biti ispunjena",
      });
    }

    if (currentPrice <= 0) {
      return res.status(400).json({
        message: "Cijena mora biti veća od 0",
      });
    }

    if (stock < 1) {
      return res.status(400).json({
        message: "Količina mora biti najmanje 1",
      });
    }

    // Create new product
    const newProduct = new Product({
      name: name.trim(),
      category,
      image: image.trim(),
      currentPrice,
      originalPrice: originalPrice || currentPrice,
      color: color?.trim() || "",
      stock: parseInt(stock),
      description: description.trim(),
      isBidding: Boolean(isBidding),
      bestBidder: null,
      userId,
      userEmail,
    });

    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({
      message: "Greška pri stvaranju proizvoda",
      error: error.message,
    });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching product", error: error.message });
  }
});

app.post("/api/products/:id/bid", async (req, res) => {
  try {
    const { bidAmount } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (!product.isBidding) {
      return res
        .status(400)
        .json({ message: "This product is not available for bidding" });
    }

    if (bidAmount <= product.currentPrice) {
      return res
        .status(400)
        .json({ message: "Bid must be higher than current price" });
    }

    product.currentPrice = bidAmount;
    product.bestBidder = req.body.username || "Anonymous";
    await product.save();

    res.json(product);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error placing bid", error: error.message });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Proizvod nije pronađen" });
    }

    // Here you might want to add authorization check
    // to ensure only the product owner or admin can delete

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Proizvod je uspješno obrisan" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({
      message: "Greška pri brisanju proizvoda",
      error: error.message,
    });
  }
});

// Test ruta
app.get("/", (req, res) => {
  res.json({ message: "Backend is running" });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
