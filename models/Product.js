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
    biddingEndTime: {
      type: Date,
      default: null,
      validate: {
        validator: function (v) {
          if (this.isBidding && !v) {
            return false; // If bidding is enabled, end time is required
          }
          if (v && v <= new Date()) {
            return false; // End time must be in the future
          }
          return true;
        },
        message:
          "Bidding end time must be set and in the future for bidding products",
      },
    },
    biddingDurationDays: {
      type: Number,
      min: 1,
      max: 30,
      default: null,
    },
    bestBidder: {
      type: String,
      default: null,
    },
    bestBidderEmail: {
      type: String,
      default: null,
      validate: {
        validator: function (v) {
          if (!v) return true; // Optional field
          return /^\S+@\S+\.\S+$/.test(v);
        },
        message: "Please enter a valid email for best bidder",
      },
    },
    bidHistory: [
      {
        bidder: {
          type: String,
          required: true,
        },
        bidderEmail: {
          type: String,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
          min: 0.01,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    biddingStatus: {
      type: String,
      enum: ["active", "ended", "sold", "cancelled"],
      default: function () {
        return this.isBidding ? "active" : "sold";
      },
    },
    winnerNotified: {
      type: Boolean,
      default: false,
    },
    reservedForWinner: {
      type: Boolean,
      default: false,
    },
    minimumBidIncrement: {
      type: Number,
      default: 1.0,
      min: 0.01,
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
productSchema.index({ biddingEndTime: 1 });
productSchema.index({ biddingStatus: 1 });
productSchema.index({ bestBidderEmail: 1 });

// Pre-save middleware to update the updatedAt field and handle bidding logic
productSchema.pre("save", function (next) {
  this.updatedAt = Date.now();

  // Auto-set bidding end time if duration is provided
  if (this.isBidding && this.biddingDurationDays && !this.biddingEndTime) {
    const endTime = new Date();
    endTime.setDate(endTime.getDate() + this.biddingDurationDays);
    this.biddingEndTime = endTime;
  }

  // Check if bidding has ended
  if (
    this.isBidding &&
    this.biddingEndTime &&
    new Date() >= this.biddingEndTime
  ) {
    if (this.biddingStatus === "active") {
      this.biddingStatus = "ended";
      if (this.bestBidder) {
        this.reservedForWinner = true;
      }
    }
  }

  next();
});

// Virtual for product age
productSchema.virtual("age").get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)); // days
});

// Virtual for time remaining in bidding
productSchema.virtual("timeRemaining").get(function () {
  if (!this.isBidding || !this.biddingEndTime) return null;

  const now = new Date();
  const timeLeft = this.biddingEndTime - now;

  if (timeLeft <= 0) return { expired: true };

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  return {
    expired: false,
    days,
    hours,
    minutes,
    totalMinutes: Math.floor(timeLeft / (1000 * 60)),
  };
});

// Virtual for bid count
productSchema.virtual("bidCount").get(function () {
  return this.bidHistory ? this.bidHistory.length : 0;
});

// Instance method to check if product is available for bidding
productSchema.methods.canBid = function () {
  if (!this.isBidding || this.stock <= 0) return false;
  if (this.biddingStatus !== "active") return false;
  if (this.biddingEndTime && new Date() >= this.biddingEndTime) return false;
  return true;
};

// Instance method to place a bid
productSchema.methods.placeBid = function (bidder, bidderEmail, amount) {
  if (!this.canBid()) {
    throw new Error("Bidding is not available for this product");
  }

  const minimumBid = this.currentPrice + this.minimumBidIncrement;
  if (amount < minimumBid) {
    throw new Error(`Bid must be at least ${minimumBid}€`);
  }

  // Add to bid history
  this.bidHistory.push({
    bidder,
    bidderEmail,
    amount,
    timestamp: new Date(),
  });

  // Update current highest bid
  this.currentPrice = amount;
  this.bestBidder = bidder;
  this.bestBidderEmail = bidderEmail;

  return this;
};

// Instance method to check if bidding has ended
productSchema.methods.isBiddingEnded = function () {
  if (!this.isBidding) return false;
  if (this.biddingStatus === "ended" || this.biddingStatus === "sold")
    return true;
  if (this.biddingEndTime && new Date() >= this.biddingEndTime) return true;
  return false;
};

// Instance method to get winner information
productSchema.methods.getWinner = function () {
  if (!this.isBiddingEnded() || !this.bestBidder) return null;

  return {
    winner: this.bestBidder,
    winnerEmail: this.bestBidderEmail,
    winningBid: this.currentPrice,
    bidCount: this.bidCount,
    notified: this.winnerNotified,
  };
};

// Instance method to reserve product for winner
productSchema.methods.reserveForWinner = function () {
  if (!this.isBiddingEnded() || !this.bestBidder) {
    throw new Error("Cannot reserve product - bidding not ended or no winner");
  }

  this.reservedForWinner = true;
  this.biddingStatus = "ended";
  return this;
};

// Static method to find products by category
productSchema.statics.findByCategory = function (category) {
  return this.find({ category: category });
};

// Static method to find active bidding products
productSchema.statics.findActiveBiddingProducts = function () {
  return this.find({
    isBidding: true,
    biddingStatus: "active",
    biddingEndTime: { $gt: new Date() },
    stock: { $gt: 0 },
  });
};

// Static method to find ended bidding products that need processing
productSchema.statics.findEndedBiddings = function () {
  return this.find({
    isBidding: true,
    biddingStatus: "active",
    biddingEndTime: { $lte: new Date() },
  });
};

// Static method to find products reserved for a specific user
productSchema.statics.findReservedForUser = function (userEmail) {
  return this.find({
    bestBidderEmail: userEmail,
    reservedForWinner: true,
    biddingStatus: "ended",
  });
};

const Product = mongoose.model("Product", productSchema);

export default Product;
