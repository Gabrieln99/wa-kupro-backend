import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Configure multer for memory storage (since we're uploading to external service)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(",") || [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Unsupported file type. Please upload an image (JPG, PNG, GIF, WebP)."
        ),
        false
      );
    }
  },
});

// Upload image to ImgBB
router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    // Check if API key is configured
    if (
      !process.env.IMGBB_API_KEY ||
      process.env.IMGBB_API_KEY === "YOUR_IMGBB_API_KEY"
    ) {
      return res.status(500).json({
        success: false,
        message:
          "Image upload service not configured. Please contact administrator.",
        fallback: true,
      });
    }

    // Create FormData for ImgBB API
    const formData = new FormData();
    formData.append("image", req.file.buffer.toString("base64"));

    // Upload to ImgBB
    const response = await axios.post(
      `${process.env.IMGBB_API_URL}?key=${process.env.IMGBB_API_KEY}`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
      }
    );

    if (response.data.success) {
      res.json({
        success: true,
        data: {
          url: response.data.data.url,
          display_url: response.data.data.display_url,
          delete_url: response.data.data.delete_url,
          size: response.data.data.size,
          filename: req.file.originalname,
        },
        message: "Image uploaded successfully",
      });
    } else {
      throw new Error("Upload failed");
    }
  } catch (error) {
    console.error("Upload error:", error);

    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 10MB.",
      });
    }

    if (error.message.includes("Unsupported file type")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to upload image. Please try again or use URL option.",
      fallback: true,
    });
  }
});

// Validate image URL endpoint
router.post("/validate-url", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: "URL is required",
      });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid URL format",
      });
    }

    // Check if URL looks like an image
    if (!url.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) {
      return res.status(400).json({
        success: false,
        message: "URL does not appear to be a valid image",
      });
    }

    // Try to fetch the image to validate it exists and is accessible
    const response = await axios.head(url, { timeout: 5000 });

    if (response.status === 200) {
      const contentType = response.headers["content-type"];
      const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(",") || [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];

      if (
        contentType &&
        allowedTypes.some((type) => contentType.includes(type.split("/")[1]))
      ) {
        res.json({
          success: true,
          data: {
            url: url,
            contentType: contentType,
            size: response.headers["content-length"],
          },
          message: "Image URL is valid",
        });
      } else {
        res.status(400).json({
          success: false,
          message: "URL does not point to a valid image",
        });
      }
    } else {
      res.status(400).json({
        success: false,
        message: "Image cannot be accessed from this URL",
      });
    }
  } catch (error) {
    console.error("URL validation error:", error);
    res.status(400).json({
      success: false,
      message: "Cannot access image from this URL",
    });
  }
});

// Get upload configuration for frontend
router.get("/config", (req, res) => {
  res.json({
    success: true,
    data: {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760,
      allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(",") || [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ],
      uploadEnabled: !!(
        process.env.IMGBB_API_KEY &&
        process.env.IMGBB_API_KEY !== "YOUR_IMGBB_API_KEY"
      ),
      suggestedServices: [
        {
          name: "ImgBB",
          url: "https://imgbb.com/",
          description: "Free image hosting with API support",
        },
        {
          name: "PostImages",
          url: "https://postimages.org/",
          description: "Simple drag & drop image hosting",
        },
        {
          name: "Imgur",
          url: "https://imgur.com/",
          description: "Popular image hosting platform",
        },
      ],
    },
  });
});

export default router;
