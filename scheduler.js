import mongoose from "mongoose";
import Product from "./models/Product.js";

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/kupro", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

/**
 * Process expired biddings and notify winners
 * This function should be called periodically (e.g., every 5 minutes via cron job)
 */
const processExpiredBiddings = async () => {
  try {
    console.log("=== PROCESSING EXPIRED BIDDINGS ===");
    console.log(`Timestamp: ${new Date().toISOString()}`);

    // Find all products with expired biddings
    const expiredProducts = await Product.find({
      biddingStatus: "active",
      biddingEndTime: { $lte: new Date() },
    });

    console.log(`Found ${expiredProducts.length} expired biddings to process`);

    const processedBiddings = [];
    const failedBiddings = [];

    for (const product of expiredProducts) {
      try {
        console.log(`\nProcessing: ${product.name} (ID: ${product._id})`);
        console.log(`  - Bidding ended: ${product.biddingEndTime}`);
        console.log(`  - Current price: ${product.currentPrice}`);
        console.log(`  - Best bidder: ${product.bestBidder || "None"}`);
        console.log(`  - Bid count: ${product.bidCount}`);

        if (product.bestBidder) {
          // Reserve product for winner
          product.reserveForWinner();
          await product.save();

          processedBiddings.push({
            productId: product._id,
            productName: product.name,
            winner: product.bestBidder,
            winnerEmail: product.bestBidderEmail,
            winningBid: product.currentPrice,
            originalPrice: product.originalPrice,
            bidCount: product.bidCount,
          });

          console.log(
            `  ✅ Reserved for winner: ${product.bestBidder} (${product.bestBidderEmail})`
          );
        } else {
          // No bids, just mark as ended
          product.biddingStatus = "ended";
          await product.save();

          console.log(`  ⚠️ No bids received, marked as ended`);
        }
      } catch (error) {
        console.error(`  ❌ Error processing ${product.name}:`, error.message);
        failedBiddings.push({
          productId: product._id,
          productName: product.name,
          error: error.message,
        });
      }
    }

    // Summary
    console.log("\n=== PROCESSING SUMMARY ===");
    console.log(`✅ Successfully processed: ${processedBiddings.length}`);
    console.log(`❌ Failed to process: ${failedBiddings.length}`);

    if (processedBiddings.length > 0) {
      console.log("\n📋 WINNERS:");
      processedBiddings.forEach((bid) => {
        console.log(
          `  - ${bid.productName}: ${bid.winner} won with €${bid.winningBid}`
        );
      });
    }

    if (failedBiddings.length > 0) {
      console.log("\n⚠️ FAILED PROCESSING:");
      failedBiddings.forEach((failed) => {
        console.log(`  - ${failed.productName}: ${failed.error}`);
      });
    }

    return {
      processed: processedBiddings.length,
      failed: failedBiddings.length,
      processedBiddings,
      failedBiddings,
    };
  } catch (error) {
    console.error("Error in processExpiredBiddings:", error);
    return { error: error.message };
  }
};

/**
 * Get statistics about current bidding status
 */
const getBiddingStats = async () => {
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

    const reservedProducts = await Product.countDocuments({
      biddingStatus: "reserved",
    });

    return {
      stats,
      activeBiddings,
      expiredBiddings,
      reservedProducts,
      needsProcessing: expiredBiddings > 0,
    };
  } catch (error) {
    console.error("Error getting bidding stats:", error);
    return { error: error.message };
  }
};

/**
 * Send notifications to winners (placeholder - implement with actual notification service)
 */
const notifyWinners = async () => {
  try {
    const reservedProducts = await Product.find({
      biddingStatus: "reserved",
      winnerNotified: false,
    });

    console.log(`\n=== NOTIFYING WINNERS ===`);
    console.log(`Found ${reservedProducts.length} winners to notify`);

    for (const product of reservedProducts) {
      // Here you would integrate with your notification service
      // For now, just log the notification details
      console.log(`📧 Notifying: ${product.bestBidderEmail}`);
      console.log(`   Product: ${product.name}`);
      console.log(`   Winning bid: €${product.currentPrice}`);
      console.log(`   Contact seller: ${product.userEmail}`);

      // Mark as notified
      product.winnerNotified = true;
      await product.save();
    }

    return { notified: reservedProducts.length };
  } catch (error) {
    console.error("Error notifying winners:", error);
    return { error: error.message };
  }
};

// CLI interface
const main = async () => {
  try {
    const command = process.argv[2] || "process";

    switch (command) {
      case "process":
        await processExpiredBiddings();
        break;

      case "stats":
        const stats = await getBiddingStats();
        console.log("=== BIDDING STATISTICS ===");
        console.log(JSON.stringify(stats, null, 2));
        break;

      case "notify":
        await notifyWinners();
        break;

      case "full":
        console.log("=== FULL BIDDING CYCLE PROCESSING ===");
        await processExpiredBiddings();
        await notifyWinners();
        const finalStats = await getBiddingStats();
        console.log("\n=== FINAL STATISTICS ===");
        console.log(JSON.stringify(finalStats, null, 2));
        break;

      default:
        console.log("Usage: node scheduler.js [process|stats|notify|full]");
        console.log("  process - Process expired biddings");
        console.log("  stats   - Show bidding statistics");
        console.log("  notify  - Notify winners");
        console.log("  full    - Run complete cycle");
    }
  } catch (error) {
    console.error("Error in main:", error);
  } finally {
    mongoose.connection.close();
  }
};

// Export functions for use in other scripts or API endpoints
export { processExpiredBiddings, getBiddingStats, notifyWinners };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
