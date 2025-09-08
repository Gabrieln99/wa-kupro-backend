import express from "express";
import Product from "./models/Product.js";

const router = express.Router();

// Get all products with advanced filtering
router.get("/", async (req, res) => {
  try {
    const {
      category,
      bidding,
      biddingStatus,
      userId,
      searchTerm,
      search,
      priceMin,
      priceMax,
      sortBy,
      page = 1,
      limit = 20,
    } = req.query;

    let query = {};
    let sort = {};

    // Search functionality
    const searchQuery = searchTerm || search;
    if (searchQuery) {
      query.$or = [
        { name: { $regex: searchQuery, $options: "i" } },
        { description: { $regex: searchQuery, $options: "i" } },
        { category: { $regex: searchQuery, $options: "i" } },
      ];
    }

    // Filter by category if provided
    if (category) {
      query.category = category;
    }

    // Filter by bidding status
    if (bidding !== undefined) {
      if (bidding === "true" || bidding === "bidding") {
        query.biddingEnabled = true;
      } else if (bidding === "false" || bidding === "regular") {
        query.biddingEnabled = { $ne: true };
      }
    }

    // Advanced bidding status filtering
    if (biddingStatus) {
      const now = new Date();
      switch (biddingStatus) {
        case "active":
          query.biddingEnabled = true;
          query.biddingStatus = "active";
          query.biddingEndTime = { $gt: now };
          break;
        case "ended":
          query.biddingEnabled = true;
          query.$or = [
            { biddingStatus: "ended" },
            { biddingStatus: "reserved" },
            {
              biddingStatus: "active",
              biddingEndTime: { $lte: now },
            },
          ];
          break;
        case "bidding":
          query.biddingEnabled = true;
          break;
        case "regular":
          query.biddingEnabled = { $ne: true };
          break;
      }
    }

    // Filter by user ID if provided
    if (userId) {
      query.userId = userId;
    }

    // Price range filtering
    if (priceMin || priceMax) {
      query.currentPrice = {};
      if (priceMin) query.currentPrice.$gte = Number(priceMin);
      if (priceMax) query.currentPrice.$lte = Number(priceMax);
    }

    // Sorting
    switch (sortBy) {
      case "newest":
        sort = { createdAt: -1 };
        break;
      case "oldest":
        sort = { createdAt: 1 };
        break;
      case "price-low":
        sort = { currentPrice: 1 };
        break;
      case "price-high":
        sort = { currentPrice: -1 };
        break;
      case "name-asc":
        sort = { name: 1 };
        break;
      case "name-desc":
        sort = { name: -1 };
        break;
      case "most-bids":
        sort = { bidCount: -1 };
        break;
      case "ending-soon":
        sort = { biddingEndTime: 1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 items per page
    const skip = (pageNum - 1) * limitNum;

    // Execute query with pagination
    const products = await Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(); // Use lean() for better performance

    // Get total count for pagination info
    const totalCount = await Product.countDocuments(query);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.json({
      products,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage,
        limit: limitNum,
      },
      filters: {
        category,
        biddingStatus,
        searchQuery,
        priceMin,
        priceMax,
        sortBy,
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      message: "Error fetching products",
      error: error.message,
    });
  }
});

// Create new product
router.post("/", async (req, res) => {
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
      biddingDurationDays,
      minimumBidIncrement,
      userId,
      userEmail,
    } = req.body;

    // Enhanced validation
    const validationErrors = [];

    if (!name?.trim()) validationErrors.push("Naziv proizvoda je obavezan");
    if (!category) validationErrors.push("Kategorija je obavezna");
    if (!image?.trim()) validationErrors.push("Slika je obavezna");
    if (!currentPrice || currentPrice <= 0)
      validationErrors.push("Cijena mora biti veća od 0");
    if (!description?.trim()) validationErrors.push("Opis je obavezan");
    if (!userId) validationErrors.push("ID korisnika je obavezan");
    if (!userEmail) validationErrors.push("Email korisnika je obavezan");

    if (description && description.length < 10) {
      validationErrors.push("Opis mora imati najmanje 10 znakova");
    }

    if (stock && (stock < 1 || !Number.isInteger(Number(stock)))) {
      validationErrors.push("Količina mora biti pozitivan cijeli broj");
    }

    // Bidding-specific validation
    if (isBidding) {
      if (
        !biddingDurationDays ||
        biddingDurationDays < 1 ||
        biddingDurationDays > 30
      ) {
        validationErrors.push(
          "Trajanje licitacije mora biti između 1 i 30 dana"
        );
      }
      if (
        minimumBidIncrement &&
        (minimumBidIncrement < 0.01 || minimumBidIncrement > 1000)
      ) {
        validationErrors.push(
          "Minimalni povećaj ponude mora biti između 0.01€ i 1000€"
        );
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: "Greške u validaciji",
        errors: validationErrors,
      });
    }

    // Prepare product data
    const productData = {
      name: name.trim(),
      category,
      image: image.trim(),
      currentPrice: Number(currentPrice),
      originalPrice: originalPrice
        ? Number(originalPrice)
        : Number(currentPrice),
      color: color?.trim() || "",
      stock: stock ? parseInt(stock) : 1,
      description: description.trim(),
      isBidding: Boolean(isBidding),
      userId,
      userEmail,
    };

    // Add bidding-specific fields if this is a bidding product
    if (isBidding) {
      productData.biddingDurationDays = Number(biddingDurationDays);
      productData.minimumBidIncrement = minimumBidIncrement
        ? Number(minimumBidIncrement)
        : 1.0;
      productData.biddingStatus = "active";
      productData.bidHistory = [];

      // Calculate bidding end time
      const endTime = new Date();
      endTime.setDate(endTime.getDate() + Number(biddingDurationDays));
      productData.biddingEndTime = endTime;
    }

    // Create new product
    const newProduct = new Product(productData);
    const savedProduct = await newProduct.save();

    res.status(201).json({
      message: "Proizvod je uspješno stvoren",
      product: savedProduct,
    });
  } catch (error) {
    console.error("Error creating product:", error);

    // Handle mongoose validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return res.status(400).json({
        message: "Greške u validaciji",
        errors: validationErrors,
      });
    }

    res.status(500).json({
      message: "Greška pri stvaranju proizvoda",
      error: error.message,
    });
  }
});

// Get single product by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        message: "Nevaljan ID proizvoda",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        message: "Proizvod nije pronađen",
      });
    }

    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({
      message: "Greška pri dohvaćanju proizvoda",
      error: error.message,
    });
  }
});

// Place bid on product
router.post("/:id/bid", async (req, res) => {
  try {
    const { id } = req.params;
    const { bidAmount, bidder, bidderEmail } = req.body;

    // Enhanced validation
    const validationErrors = [];

    if (!bidAmount || bidAmount <= 0) {
      validationErrors.push("Ponuda mora biti veća od 0");
    }
    if (!bidder?.trim()) {
      validationErrors.push("Ime licitanta je obavezno");
    }
    if (!bidderEmail?.trim()) {
      validationErrors.push("Email licitanta je obavezan");
    }
    if (bidderEmail && !/^\S+@\S+\.\S+$/.test(bidderEmail)) {
      validationErrors.push("Email licitanta nije valjan");
    }

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        message: "Nevaljan ID proizvoda",
      });
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: "Greške u validaciji",
        errors: validationErrors,
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        message: "Proizvod nije pronađen",
      });
    }

    // Check if user is trying to bid on their own product
    if (product.userEmail === bidderEmail) {
      return res.status(400).json({
        message: "Ne možete licitirati na vlastiti proizvod",
      });
    }

    if (!product.canBid()) {
      const timeRemaining = product.timeRemaining;
      if (timeRemaining && timeRemaining.expired) {
        return res.status(400).json({
          message: "Licitacija je završena",
        });
      }
      return res.status(400).json({
        message: "Ovaj proizvod nije dostupan za licitaciju",
      });
    }

    // Use the model's placeBid method for validation and bid placement
    try {
      product.placeBid(bidder.trim(), bidderEmail.trim(), Number(bidAmount));
      await product.save();

      // Return updated product with bidding information
      const updatedProduct = await Product.findById(id);

      res.json({
        message: "Ponuda je uspješno stavljena",
        product: updatedProduct,
        bidInfo: {
          newHighestBid: updatedProduct.currentPrice,
          bidder: updatedProduct.bestBidder,
          bidCount: updatedProduct.bidCount,
          timeRemaining: updatedProduct.timeRemaining,
        },
      });
    } catch (bidError) {
      return res.status(400).json({
        message: bidError.message,
      });
    }
  } catch (error) {
    console.error("Error placing bid:", error);
    console.error("Error placing bid:", error);
    res.status(500).json({
      message: "Greška pri stavljanju ponude",
      error: error.message,
    });
  }
});

// Update product
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        message: "Nevaljan ID proizvoda",
      });
    }

    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.bestBidder; // Should only be updated through bidding

    const product = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({
        message: "Proizvod nije pronađen",
      });
    }

    res.json({
      message: "Proizvod je uspješno ažuriran",
      product: product,
    });
  } catch (error) {
    console.error("Error updating product:", error);

    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return res.status(400).json({
        message: "Greške u validaciji",
        errors: validationErrors,
      });
    }

    res.status(500).json({
      message: "Greška pri ažuriranju proizvoda",
      error: error.message,
    });
  }
});

// Get bid history for a product
router.get("/:id/bids", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        message: "Nevaljan ID proizvoda",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        message: "Proizvod nije pronađen",
      });
    }

    res.json({
      productId: id,
      productName: product.name,
      biddingStatus: product.biddingStatus,
      currentPrice: product.currentPrice,
      bestBidder: product.bestBidder,
      bidCount: product.bidCount,
      timeRemaining: product.timeRemaining,
      bidHistory: product.bidHistory.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      ),
      biddingEndTime: product.biddingEndTime,
    });
  } catch (error) {
    console.error("Error fetching bid history:", error);
    res.status(500).json({
      message: "Greška pri dohvaćanju povijesti licitacije",
      error: error.message,
    });
  }
});

// Get active bidding products
router.get("/bidding/active", async (req, res) => {
  try {
    const activeBiddings = await Product.findActiveBiddingProducts();

    res.json({
      count: activeBiddings.length,
      products: activeBiddings.map((product) => ({
        id: product._id,
        name: product.name,
        category: product.category,
        image: product.image,
        currentPrice: product.currentPrice,
        originalPrice: product.originalPrice,
        bestBidder: product.bestBidder,
        bidCount: product.bidCount,
        timeRemaining: product.timeRemaining,
        biddingEndTime: product.biddingEndTime,
        minimumBidIncrement: product.minimumBidIncrement,
      })),
    });
  } catch (error) {
    console.error("Error fetching active biddings:", error);
    res.status(500).json({
      message: "Greška pri dohvaćanju aktivnih licitacija",
      error: error.message,
    });
  }
});

// Get products reserved for a specific user (won biddings)
router.get("/reserved/:userEmail", async (req, res) => {
  try {
    const { userEmail } = req.params;

    if (!userEmail || !/^\S+@\S+\.\S+$/.test(userEmail)) {
      return res.status(400).json({
        message: "Valjan email je obavezan",
      });
    }

    const reservedProducts = await Product.findReservedForUser(userEmail);

    res.json({
      count: reservedProducts.length,
      products: reservedProducts.map((product) => ({
        id: product._id,
        name: product.name,
        category: product.category,
        image: product.image,
        winningBid: product.currentPrice,
        originalPrice: product.originalPrice,
        bidCount: product.bidCount,
        winnerNotified: product.winnerNotified,
        biddingEndTime: product.biddingEndTime,
        seller: {
          userId: product.userId,
          email: product.userEmail,
        },
      })),
    });
  } catch (error) {
    console.error("Error fetching reserved products:", error);
    res.status(500).json({
      message: "Greška pri dohvaćanju rezerviranih proizvoda",
      error: error.message,
    });
  }
});

// Mark winner as notified
router.post("/:id/notify-winner", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        message: "Nevaljan ID proizvoda",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        message: "Proizvod nije pronađen",
      });
    }

    if (!product.isBiddingEnded() || !product.bestBidder) {
      return res.status(400).json({
        message: "Licitacija nije završena ili nema pobjednika",
      });
    }

    product.winnerNotified = true;
    await product.save();

    res.json({
      message: "Pobjednik je obaviješten",
      winner: product.getWinner(),
    });
  } catch (error) {
    console.error("Error notifying winner:", error);
    res.status(500).json({
      message: "Greška pri obavještavanju pobjednika",
      error: error.message,
    });
  }
});

// Reserve product for winner (move to cart)
router.post("/:id/reserve", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        message: "Nevaljan ID proizvoda",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        message: "Proizvod nije pronađen",
      });
    }

    try {
      product.reserveForWinner();
      await product.save();

      res.json({
        message: "Proizvod je rezerviran za pobjednika",
        product: {
          id: product._id,
          name: product.name,
          winner: product.bestBidder,
          winnerEmail: product.bestBidderEmail,
          finalPrice: product.currentPrice,
        },
      });
    } catch (reserveError) {
      return res.status(400).json({
        message: reserveError.message,
      });
    }
  } catch (error) {
    console.error("Error reserving product:", error);
    res.status(500).json({
      message: "Greška pri rezervaciji proizvoda",
      error: error.message,
    });
  }
});

// Process ended biddings (utility endpoint for cron jobs)
router.post("/bidding/process-ended", async (req, res) => {
  try {
    const endedBiddings = await Product.findEndedBiddings();
    const processed = [];

    for (const product of endedBiddings) {
      if (product.bestBidder) {
        product.reserveForWinner();
        await product.save();
        processed.push({
          productId: product._id,
          productName: product.name,
          winner: product.bestBidder,
          winnerEmail: product.bestBidderEmail,
          winningBid: product.currentPrice,
        });
      } else {
        product.biddingStatus = "ended";
        await product.save();
      }
    }

    res.json({
      message: `Processed ${processed.length} ended biddings`,
      processedBiddings: processed,
    });
  } catch (error) {
    console.error("Error processing ended biddings:", error);
    res.status(500).json({
      message: "Greška pri obradi završenih licitacija",
      error: error.message,
    });
  }
});

// Get product categories (utility endpoint)
router.get("/util/categories", async (req, res) => {
  try {
    const categories = [
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
    ];

    res.json({
      categories: categories,
      message: "Dostupne kategorije proizvoda",
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      message: "Greška pri dohvaćanju kategorija",
      error: error.message,
    });
  }
});

// Update the delete route to check for active biddings
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        message: "Nevaljan ID proizvoda",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        message: "Proizvod nije pronađen",
      });
    }

    // Check if product has active bidding
    if (product.isBiddingActive()) {
      return res.status(400).json({
        message: "Proizvod se ne može obrisati dok je licitacija aktivna",
      });
    }

    await Product.findByIdAndDelete(id);

    res.json({
      message: "Proizvod je uspješno obrisan",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({
      message: "Greška pri brisanju proizvoda",
      error: error.message,
    });
  }
});

// Utility endpoint to check bidding statuses
router.get("/bidding/status", async (req, res) => {
  try {
    const stats = await Product.aggregate([
      {
        $group: {
          _id: "$biddingStatus",
          count: { $sum: 1 },
          avgCurrentPrice: { $avg: "$currentPrice" },
          totalBids: { $sum: "$bidCount" },
        },
      },
    ]);

    const activeBiddings = await Product.countDocuments({
      biddingStatus: "active",
      biddingEndTime: { $gt: new Date() },
    });

    const expiredBiddings = await Product.countDocuments({
      biddingStatus: "active",
      biddingEndTime: { $lte: new Date() },
    });

    res.json({
      stats,
      activeBiddings,
      expiredBiddings,
      needsProcessing: expiredBiddings > 0,
    });
  } catch (error) {
    console.error("Error getting bidding status:", error);
    res.status(500).json({
      message: "Greška pri dohvaćanju statusa licitacija",
      error: error.message,
    });
  }
});

export default router;
