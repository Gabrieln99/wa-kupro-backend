import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authenticateToken, isAdmin } from "./middlewares.js";

const router = express.Router();

// User Schema
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    surname: {
      type: String,
      required: true,
    },
    oib: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (v) {
          return /^\d{11}$/.test(v);
        },
        message: "OIB must be exactly 11 digits",
      },
    },
    address: {
      type: String,
      required: true,
    },
    cardInfo: {
      cardNumber: {
        type: String,
        required: true,
        validate: {
          validator: function (v) {
            return /^\d{16}$/.test(v);
          },
          message: "Card number must be 16 digits",
        },
      },
      expiryDate: {
        type: String,
        required: true,
        validate: {
          validator: function (v) {
            return /^(0[1-9]|1[0-2])\/([0-9]{2})$/.test(v);
          },
          message: "Expiry date must be in MM/YY format",
        },
      },
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (v) {
          return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
        },
        message: "Please enter a valid email",
      },
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: "korisnici", versionKey: false }
);

const User = mongoose.model("User", userSchema);

// Register route
router.post("/register", async (req, res) => {
  try {
    const { name, surname, oib, address, cardInfo, username, email, password } =
      req.body;

    // Check existing user
    const userExists = await User.findOne({
      $or: [{ username }, { email }, { oib }],
    });

    if (userExists) {
      return res.status(400).json({
        message: "User with this username, email or OIB already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = await User.create({
      name,
      surname,
      oib,
      address,
      cardInfo,
      username,
      email,
      password: hashedPassword,
      role: "user", // Default role
    });

    res.status(201).json({
      message: "User registered successfully",
      userId: user._id,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// Login route
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    res.json({
      token,
      userId: user._id,
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// Create admin account (protected route)
router.post("/create-admin", async (req, res) => {
  try {
    const adminToken = req.headers.authorization;

    if (adminToken !== process.env.ADMIN_CREATE_TOKEN) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    const { name, surname, oib, address, cardInfo, username, email, password } =
      req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await User.create({
      name,
      surname,
      oib,
      address,
      cardInfo,
      username,
      email,
      password: hashedPassword,
      role: "admin",
    });

    res.status(201).json({
      message: "Admin account created successfully",
      userId: admin._id,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// Get all users (admin only)
router.get("/users", authenticateToken, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password -cardInfo");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user route
router.get("/user/:id", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "-password -cardInfo"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Logout route (blacklist token)
router.post("/logout", authenticateToken, async (req, res) => {
  // In a production environment, you would want to blacklist the token
  // For now, we'll just send a success response
  res.json({ message: "Logged out successfully" });
});

// Delete user route (admin only)
router.delete("/user/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(400).json({ message: "Cannot delete admin user" });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Promote user to admin (admin only)
router.patch("/promote/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(400).json({ message: "User is already an admin" });
    }

    user.role = "admin";
    await user.save();

    res.json({ message: "User promoted to admin successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
