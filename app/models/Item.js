// models/Item.js

// Bidder class for handling bidder data
export class Bidder {
  constructor({
    id = null,
    bidderId,
    bidderName,
    bidAmount,
    bidTime = null,
    isWinning = false
  }) {
    this.id = id;
    this.bidderId = bidderId;
    this.bidderName = bidderName;
    this.bidAmount = parseFloat(bidAmount);
    this.bidTime = bidTime || new Date().toISOString();
    this.isWinning = isWinning;
  }

  // Convert to Firestore document format
  toFirestore() {
    return {
      bidderId: this.bidderId,
      bidderName: this.bidderName,
      bidAmount: this.bidAmount,
      bidTime: this.bidTime,
      isWinning: this.isWinning
    };
  }

  // Create from Firestore document
  static fromFirestore(doc) {
    const data = doc.data();
    return new Bidder({
      id: doc.id,
      ...data
    });
  }
}

export class Item {
  constructor({
    id = null,
    itemName,
    description,
    startingBid,
    shippingCost = 0,
    category,
    condition,
    endDateTime = null,
    photos = [],
    totalBids = 0,
    status = 'active', // active, sold, expired
    createdAt = null,
    expiresAt = null,
    updatedAt = null,
    buyerId = null,
    buyerName = null,
    buyerEmail = null,
    finalBidAmount = null,
    soldAt = null
  }) {
    this.id = id;
    this.itemName = itemName;
    this.description = description;
    this.startingBid = parseFloat(startingBid);
    this.shippingCost = parseFloat(shippingCost);
    this.category = category;
    this.condition = condition;
    this.endDateTime = endDateTime;
    this.photos = photos;
    this.totalBids = totalBids;
    this.status = status;
    this.createdAt = createdAt || new Date().toISOString();
    this.expiresAt = expiresAt || endDateTime || this.calculateDefaultExpiryDate();
    this.updatedAt = updatedAt || new Date().toISOString();
    this.buyerId = buyerId;
    this.buyerName = buyerName;
    this.buyerEmail = buyerEmail;
    this.finalBidAmount = finalBidAmount ? parseFloat(finalBidAmount) : null;
    this.soldAt = soldAt;
  }

  // Calculate default expiry date (7 days from now if no endDateTime provided)
  calculateDefaultExpiryDate() {
    const now = new Date();
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  // Validate item data
  validate() {
    const errors = [];

    if (!this.itemName || this.itemName.trim().length < 3) {
      errors.push('Item name must be at least 3 characters long');
    }

    if (!this.description || this.description.trim().length < 10) {
      errors.push('Description must be at least 10 characters long');
    }

    if (!this.startingBid || this.startingBid <= 0) {
      errors.push('Starting bid must be greater than 0');
    }

    if (this.shippingCost < 0) {
      errors.push('Shipping cost cannot be negative');
    }

    if (!this.category) {
      errors.push('Category is required');
    }

    if (!this.condition) {
      errors.push('Condition is required');
    }

    if (!this.endDateTime) {
      errors.push('End date and time is required');
    } else {
      const endDate = new Date(this.endDateTime);
      if (endDate <= new Date()) {
        errors.push('End date and time must be in the future');
      }
    }

    if (!this.photos || this.photos.length === 0) {
      errors.push('At least one photo is required');
    }

    return errors;
  }

  // Convert to Firestore document format
  toFirestore() {
    return {
      itemName: this.itemName,
      description: this.description,
      startingBid: this.startingBid,
      shippingCost: this.shippingCost,
      category: this.category,
      condition: this.condition,
      endDateTime: this.endDateTime,
      photos: this.photos,
      totalBids: this.totalBids,
      status: this.status,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
      updatedAt: this.updatedAt,
      buyerId: this.buyerId,
      buyerName: this.buyerName,
      buyerEmail: this.buyerEmail,
      finalBidAmount: this.finalBidAmount,
      soldAt: this.soldAt
    };
  }

  // Create from Firestore document
  static fromFirestore(doc) {
    const data = doc.data();
    return new Item({
      id: doc.id,
      ...data
    });
  }

  // Update total bids count
  updateTotalBids() {
    this.totalBids += 1;
    this.updatedAt = new Date().toISOString();
  }

  // Check if item is expired
  isExpired() {
    return new Date() > new Date(this.expiresAt);
  }

  // Get time remaining
  getTimeRemaining() {
    const now = new Date();
    const expiry = new Date(this.expiresAt);
    const diff = expiry - now;

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
}

export default Item;
