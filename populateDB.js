import mongoose from "mongoose";
import connectToDatabase from "./databaseConnector.js";

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
  createdAt: { type: Date, default: Date.now },
});

const Product = mongoose.model("Product", productSchema);

// Sample products data
const sampleProducts = [
  {
    name: "iPhone 15 Pro",
    category: "Elektronika",
    image: "https://via.placeholder.com/300x200/3b82f6/ffffff?text=iPhone+15",
    currentPrice: 999,
    originalPrice: 999,
    color: "Titanium",
    stock: 5,
    description:
      "Najnoviji iPhone s titanijskim kućištem i A17 Pro čipom. Profesionalna kamera s 3x zoom.",
    isBidding: false,
  },
  {
    name: "Vintage Rolex Submariner",
    category: "Satovi",
    image: "https://via.placeholder.com/300x200/10b981/ffffff?text=Rolex",
    currentPrice: 2500,
    originalPrice: 2500,
    color: "Zlatni",
    stock: 1,
    description:
      "Rijetki vintage Rolex Submariner iz 1960-ih godina. Izuzetno stanje, originalna kutija.",
    isBidding: true,
    bestBidder: null,
  },
  {
    name: 'MacBook Pro 14"',
    category: "Računala",
    image: "https://via.placeholder.com/300x200/3b82f6/ffffff?text=MacBook",
    currentPrice: 1899,
    originalPrice: 1899,
    color: "Space Grey",
    stock: 3,
    description:
      "MacBook Pro 14-inch s M3 čipom, 16GB RAM, 512GB SSD. Idealno za profesionalce.",
    isBidding: false,
  },
  {
    name: "Antique Ming Vase",
    category: "Antikviteti",
    image: "https://via.placeholder.com/300x200/fbbf24/ffffff?text=Ming+Vase",
    currentPrice: 150,
    originalPrice: 150,
    color: "Plavi",
    stock: 1,
    description:
      "Stara kineska vaza iz Ming dinastije. Autentičnost potvrđena od strane stručnjaka.",
    isBidding: true,
    bestBidder: null,
  },
  {
    name: "Gaming Chair RGB",
    category: "Namještaj",
    image:
      "https://via.placeholder.com/300x200/8b5cf6/ffffff?text=Gaming+Chair",
    currentPrice: 299,
    originalPrice: 349,
    color: "Crni",
    stock: 8,
    description:
      "Ergonomska gaming stolica s RGB osvjetljenjem i lumbalnom podrškom.",
    isBidding: false,
  },
  {
    name: "Vintage Guitar 1975",
    category: "Glazbala",
    image:
      "https://via.placeholder.com/300x200/f59e0b/ffffff?text=Vintage+Guitar",
    currentPrice: 800,
    originalPrice: 800,
    color: "Sunburst",
    stock: 1,
    description:
      "Vintage električna gitara iz 1975. godine. Ručno izrađena, izuzetna reverb.",
    isBidding: true,
    bestBidder: null,
  },
];

async function populateDatabase() {
  try {
    // Connect to database
    await connectToDatabase();

    // Clear existing products
    await Product.deleteMany({});
    console.log("Existing products deleted");

    // Insert sample products
    const insertedProducts = await Product.insertMany(sampleProducts);
    console.log(`${insertedProducts.length} products inserted successfully:`);

    insertedProducts.forEach((product) => {
      console.log(`- ${product.name} (${product._id})`);
    });

    console.log("\nDatabase populated successfully!");
  } catch (error) {
    console.error("Error populating database:", error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log("Database connection closed");
  }
}

// Run the population script
populateDatabase();
