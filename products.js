import express from "express";
import Product from "./models/Product.js";

const router = express.Router();

// Get all products
router.get("/", async (req, res) => {
  try {
    const { category, bidding, userId } = req.query;
    let query = {};

    // Filter by category if provided
    if (category) {
      query.category = category;
    }

    // Filter by bidding status if provided
    if (bidding !== undefined) {
      query.isBidding = bidding === "true";
    }

    // Filter by user ID if provided
    if (userId) {
      query.userId = userId;
    }

    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
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

    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: "Greške u validaciji",
        errors: validationErrors,
      });
    }

    // Create new product
    const newProduct = new Product({
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
      bestBidder: null,
      userId,
      userEmail,
    });

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
    const { bidAmount, username } = req.body;

    // Validate input
    if (!bidAmount || bidAmount <= 0) {
      return res.status(400).json({
        message: "Ponuda mora biti veća od 0",
      });
    }

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

    if (!product.canBid()) {
      return res.status(400).json({
        message: "Ovaj proizvod nije dostupan za licitaciju",
      });
    }

    if (Number(bidAmount) <= product.currentPrice) {
      return res.status(400).json({
        message: `Ponuda mora biti veća od trenutne cijene (${product.currentPrice}€)`,
      });
    }

    // Update product with new bid
    product.currentPrice = Number(bidAmount);
    product.bestBidder = username || "Anonymous";
    await product.save();

    res.json({
      message: "Ponuda je uspješno stavljena",
      product: product,
    });
  } catch (error) {
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

// Delete product
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

    // Here you might want to add authorization check
    // to ensure only the product owner or admin can delete
    // if (product.userId !== req.user.id && !req.user.isAdmin) {
    //   return res.status(403).json({ message: "Nemate ovlasti za brisanje ovog proizvoda" });
    // }

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

export default router;
