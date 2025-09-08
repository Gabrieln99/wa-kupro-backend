# Bidding System Documentation

## Overview

This comprehensive bidding system allows users to create timed auctions for their products. Product owners can set bidding duration (1-30 days), and the highest bidder at the end gets the exclusive opportunity to purchase the product.

## Features

### 🏷️ Core Bidding Features

- **Timed Auctions**: Set bidding duration from 1 to 30 days
- **Minimum Bid Increments**: Configurable minimum increase per bid
- **Real-time Bidding**: Live bid tracking and updates
- **Bid History**: Complete history of all bids with timestamps
- **Winner Notification**: Automatic winner detection and notification
- **Product Reservation**: Products are reserved for winners after auction ends

### 🔒 Security & Validation

- **Bid Validation**: Ensures bids meet minimum requirements
- **Timer Validation**: Prevents bids on expired auctions
- **User Authentication**: Tracks bidders and product owners
- **Anti-self-bidding**: Prevents product owners from bidding on their own items

### 📊 Monitoring & Management

- **Bidding Statistics**: Real-time stats on active/ended auctions
- **Automated Processing**: Background processing of expired auctions
- **Winner Management**: Track notified winners and reserved products
- **Admin Dashboard**: Overview of all bidding activities

## API Endpoints

### Product Management with Bidding

#### Create Product with Bidding

```
POST /api/products
{
  "name": "Product Name",
  "description": "Description",
  "category": "Category",
  "originalPrice": 1000,
  "biddingEnabled": true,
  "biddingDuration": 7,  // days
  "minimumBidIncrement": 50,
  "userId": "user_id",
  "userEmail": "user@example.com"
}
```

#### Get All Products (includes bidding info)

```
GET /api/products
Response includes: timeRemaining, biddingStatus, bidCount, bestBidder
```

#### Get Single Product (includes full bidding details)

```
GET /api/products/:id
Response includes: bidHistory, timeRemaining, canBid status
```

### Bidding Operations

#### Place a Bid

```
POST /api/products/:id/bid
{
  "bidderName": "John Doe",
  "bidderEmail": "john@example.com",
  "bidAmount": 1100
}
```

#### Get Bid History

```
GET /api/products/:id/bids
Returns: Complete bid history with timestamps and bidder info
```

#### Get Active Biddings

```
GET /api/products/bidding/active
Returns: All products with active biddings
```

#### Get Reserved Products (for winners)

```
GET /api/products/reserved/:userEmail
Returns: Products won by the user
```

### Bidding Management

#### Process Expired Biddings

```
POST /api/products/bidding/process-ended
Returns: List of processed auctions and winners
```

#### Get Bidding Statistics

```
GET /api/products/bidding/status
Returns: Stats on active/ended/reserved auctions
```

#### Notify Winner

```
POST /api/products/:id/notify-winner
Marks winner as notified
```

#### Reserve Product for Winner

```
POST /api/products/:id/reserve
Reserves product for auction winner
```

## Database Schema

### Product Model Bidding Fields

```javascript
{
  // Bidding Configuration
  biddingEnabled: Boolean,
  biddingDuration: Number,        // Duration in days (1-30)
  minimumBidIncrement: Number,    // Minimum bid increase

  // Bidding State
  biddingStatus: {
    type: String,
    enum: ['none', 'active', 'ended', 'reserved'],
    default: 'none'
  },
  biddingEndTime: Date,

  // Current Auction State
  currentPrice: Number,           // Current highest bid
  bestBidder: String,            // Name of highest bidder
  bestBidderEmail: String,       // Email of highest bidder
  bidCount: Number,              // Total number of bids

  // Bid History
  bidHistory: [{
    bidderName: String,
    bidderEmail: String,
    bidAmount: Number,
    timestamp: Date,
    isWinning: Boolean
  }],

  // Winner Management
  winnerNotified: Boolean,
  reservedAt: Date
}
```

### Virtual Fields

```javascript
// Computed properties
timeRemaining: String; // Human-readable time left
canBid: Boolean; // Whether new bids are accepted
isExpired: Boolean; // Whether auction has ended
```

### Methods

```javascript
// Instance methods
product.enableBidding(days); // Start bidding for X days
product.placeBid(name, email, amount); // Place a new bid
product.isBiddingActive(); // Check if bidding is active
product.isBiddingEnded(); // Check if bidding has ended
product.getWinner(); // Get winner details
product.reserveForWinner(); // Reserve for winner

// Static methods
Product.findActiveBiddingProducts(); // Get all active auctions
Product.findEndedBiddings(); // Get expired auctions
Product.findReservedForUser(email); // Get user's won products
```

## Usage Examples

### Starting a Bidding Campaign

```javascript
// Create product with bidding
const product = new Product({
  name: "Vintage Guitar",
  originalPrice: 1000,
  biddingEnabled: true,
  minimumBidIncrement: 25,
});

// Enable bidding for 7 days
product.enableBidding(7);
await product.save();
```

### Placing Bids

```javascript
// Frontend bid placement
const response = await fetch(`/api/products/${productId}/bid`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    bidderName: "Jane Smith",
    bidderEmail: "jane@example.com",
    bidAmount: 1025,
  }),
});
```

### Monitoring Biddings

```javascript
// Get real-time bidding status
const biddingStats = await fetch("/api/products/bidding/status");

// Process expired auctions (run via scheduler)
const processed = await fetch("/api/products/bidding/process-ended", {
  method: "POST",
});
```

## Automated Processing

### Scheduler Script

Run the scheduler to handle expired auctions:

```bash
# Process expired biddings
node scheduler.js process

# Get statistics
node scheduler.js stats

# Notify winners
node scheduler.js notify

# Full cycle (process + notify + stats)
node scheduler.js full
```

### Cron Job Setup

Set up automated processing (every 5 minutes):

```bash
# Add to crontab
*/5 * * * * cd /path/to/project && node scheduler.js process
0 * * * * cd /path/to/project && node scheduler.js notify
```

## Frontend Integration

### Real-time Timer Display

```javascript
// Calculate and display remaining time
const timeRemaining = product.timeRemaining;
// Display: "2 days, 3 hours, 45 minutes remaining"
```

### Bid History Component

```javascript
// Show bid history with live updates
const bidHistory = await fetch(`/api/products/${id}/bids`);
// Display chronological list of bids
```

### Active Bidding Feed

```javascript
// Show all active auctions
const activeBiddings = await fetch("/api/products/bidding/active");
// Display grid of products with timers
```

## Testing

### Populate Test Data

```bash
# Create sample bidding products
node populateBiddingDB.js
```

### Test Scenarios

1. **Create bidding product** - Test product creation with bidding enabled
2. **Place bids** - Test bid validation and placement
3. **Timer expiration** - Test auction ending and winner selection
4. **Winner notification** - Test reservation and notification system
5. **Edge cases** - Test validation, duplicate bids, expired auctions

## Best Practices

### For Product Owners

- Set reasonable bidding duration (3-14 days recommended)
- Use appropriate minimum bid increments (5-10% of starting price)
- Monitor bidding activity and respond to questions
- Be available for winner contact after auction ends

### For Bidders

- Check auction end time before bidding
- Set maximum bid amount and stick to it
- Monitor competing bids and bid strategically
- Be prepared to complete purchase if you win

### For Administrators

- Run scheduler regularly to process expired auctions
- Monitor bidding statistics for system health
- Handle disputes and edge cases promptly
- Backup bid history data regularly

## Troubleshooting

### Common Issues

1. **Bids not accepting** - Check if auction is still active and bid meets minimum
2. **Timer not updating** - Ensure frontend is calculating from biddingEndTime
3. **Winners not notified** - Run scheduler notify command manually
4. **Products not reserved** - Check if processExpiredBiddings ran successfully

### Debug Commands

```bash
# Check bidding status
node scheduler.js stats

# Manually process expired
node scheduler.js process

# Check specific product
curl http://localhost:3000/api/products/:id/bids
```

## Security Considerations

- Validate all bid amounts server-side
- Prevent bid tampering through proper authentication
- Log all bidding activities for audit purposes
- Rate limit bid placement to prevent spam
- Secure winner notification and contact information

## Performance Optimization

- Index biddingEndTime field for efficient expired auction queries
- Cache active bidding counts for dashboard displays
- Paginate bid history for products with many bids
- Use database aggregation for statistics rather than application logic

---

_This bidding system provides a complete auction platform with timer-based functionality, automated processing, and comprehensive tracking of all bidding activities._
