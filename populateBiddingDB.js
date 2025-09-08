import mongoose from "mongoose";
import Product from "./models/Product.js";

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/kupro", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const sampleBiddingProducts = [
  {
    name: "Vintage Rolex Submariner",
    description:
      "Authentic 1980s Rolex Submariner in excellent condition. Perfect for collectors.",
    category: "Satovi",
    originalPrice: 8000,
    currentPrice: 8000,
    userId: "64b8f5a1c123456789abcdef",
    userEmail: "seller1@example.com",
    biddingEnabled: true,
    biddingDuration: 7, // 7 days
    minimumBidIncrement: 100,
    image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=300",
  },
  {
    name: "Gaming Laptop RTX 4070",
    description:
      "High-performance gaming laptop with RTX 4070, 32GB RAM, and 1TB SSD.",
    category: "Elektronika",
    originalPrice: 2500,
    currentPrice: 2500,
    userId: "64b8f5a1c123456789abcde0",
    userEmail: "gamer@example.com",
    biddingEnabled: true,
    biddingDuration: 5, // 5 days
    minimumBidIncrement: 50,
    image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=300",
  },
  {
    name: "Classic Guitar Fender Stratocaster",
    description:
      "1985 Fender Stratocaster in sunburst finish. Great for musicians and collectors.",
    category: "Glazbeni instrumenti",
    originalPrice: 1200,
    currentPrice: 1200,
    userId: "64b8f5a1c123456789abcde1",
    userEmail: "musician@example.com",
    biddingEnabled: true,
    biddingDuration: 10, // 10 days
    minimumBidIncrement: 25,
    image: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=300",
  },
  {
    name: "Mountain Bike Trek Full Suspension",
    description:
      "Professional mountain bike with full suspension. Perfect for trails.",
    category: "Sport i rekreacija",
    originalPrice: 800,
    currentPrice: 800,
    userId: "64b8f5a1c123456789abcde2",
    userEmail: "cyclist@example.com",
    biddingEnabled: true,
    biddingDuration: 3, // 3 days
    minimumBidIncrement: 20,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300",
  },
  {
    name: "Designer Leather Handbag",
    description:
      "Authentic designer handbag in excellent condition. Limited edition.",
    category: "Moda i odjeća",
    originalPrice: 600,
    currentPrice: 600,
    userId: "64b8f5a1c123456789abcde3",
    userEmail: "fashionista@example.com",
    biddingEnabled: true,
    biddingDuration: 14, // 14 days
    minimumBidIncrement: 15,
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300",
  },
];

const populateBiddingDatabase = async () => {
  try {
    // Clear existing products with bidding
    await Product.deleteMany({ biddingEnabled: true });
    console.log("Cleared existing bidding products");

    // Create new bidding products
    for (const productData of sampleBiddingProducts) {
      const product = new Product(productData);

      // Enable bidding and set end time
      product.enableBidding(productData.biddingDuration);

      await product.save();
      console.log(
        `Created bidding product: ${product.name} (ends: ${product.biddingEndTime})`
      );
    }

    console.log("\n=== DATABASE POPULATED WITH BIDDING PRODUCTS ===");
    console.log(`Created ${sampleBiddingProducts.length} bidding products`);

    // Add some sample bids to make it more realistic
    await addSampleBids();

    console.log("\n=== SAMPLE BIDS ADDED ===");
    console.log("Database is ready for testing!");
  } catch (error) {
    console.error("Error populating database:", error);
  } finally {
    mongoose.connection.close();
  }
};

const addSampleBids = async () => {
  try {
    const products = await Product.find({ biddingEnabled: true });

    // Sample bidders
    const bidders = [
      { name: "Ana Marić", email: "ana@example.com" },
      { name: "Marko Petković", email: "marko@example.com" },
      { name: "Petra Novak", email: "petra@example.com" },
      { name: "Luka Jurić", email: "luka@example.com" },
      { name: "Maja Kovač", email: "maja@example.com" },
    ];

    for (const product of products) {
      // Add 2-4 bids per product
      const numberOfBids = Math.floor(Math.random() * 3) + 2;

      for (let i = 0; i < numberOfBids; i++) {
        const bidder = bidders[Math.floor(Math.random() * bidders.length)];
        const bidAmount =
          product.currentPrice + product.minimumBidIncrement * (i + 1);

        try {
          await product.placeBid(bidder.name, bidder.email, bidAmount);
          console.log(`  - ${bidder.name} bid ${bidAmount} on ${product.name}`);
        } catch (bidError) {
          // Skip if bid fails (probably too low)
          console.log(
            `  - Failed bid from ${bidder.name} on ${product.name}: ${bidError.message}`
          );
        }
      }

      await product.save();
    }
  } catch (error) {
    console.error("Error adding sample bids:", error);
  }
};

// Run the population script
populateBiddingDatabase();
