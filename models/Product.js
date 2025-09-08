import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Elektronika",
        "Namještaj",
        "Odjeća",
        "Knjige",
        "Sport",
        "Igračke",
        "Antikviteti",
        "Satovi",
        "Računala",
        "Glazbala",
        "Ostalo",
      ],
    },
    image: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^https?:\/\/.+/.test(v);
        },
        message: "Image must be a valid URL",
      },
    },
    currentPrice: {
      type: Number,
      required: true,
      min: 0.01,
    },
    originalPrice: {
      type: Number,
      min: 0.01,
    },
    color: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    stock: {
      type: Number,
      default: 1,
      min: 0,
    },
    description: {
      type: String,
      default: "Opis proizvoda.",
      trim: true,
      maxlength: 1000,
    },
    isBidding: {
      type: Boolean,
      default: false,
    },
    bestBidder: {
      type: String,
      default: null,
    },
    userId: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^\S+@\S+\.\S+$/.test(v);
        },
        message: "Please enter a valid email",
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
productSchema.index({ category: 1, createdAt: -1 });
productSchema.index({ userId: 1 });
productSchema.index({ isBidding: 1 });

// Pre-save middleware to update the updatedAt field
productSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for product age
productSchema.virtual("age").get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)); // days
});

// Instance method to check if product is available for bidding
productSchema.methods.canBid = function () {
  return this.isBidding && this.stock > 0;
};

// Static method to find products by category
productSchema.statics.findByCategory = function (category) {
  return this.find({ category: category });
};

// Static method to find bidding products
productSchema.statics.findBiddingProducts = function () {
  return this.find({ isBidding: true, stock: { $gt: 0 } });
};

const Product = mongoose.model("Product", productSchema);

export default Product;
