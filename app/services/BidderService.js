// services/BidderService.js
import { collection, addDoc, doc, getDocs, query, orderBy, updateDoc, where, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Bidder } from '../models/Item';

export class BidderService {
  
  // Add a new bid to an item's bidders collection
  static async addBid(itemId, bidderData) {
    try {
      const bidder = new Bidder(bidderData);
      
      // Add bidder to the item's bidders subcollection
      const biddersRef = collection(db, 'listings', 'listings', 'active', itemId, 'bidders');
      const docRef = await addDoc(biddersRef, bidder.toFirestore());
      
      // Update all other bidders for this item to not be winning
      await this.updateWinningStatus(itemId, docRef.id);
      
      // Update the item's totalBids count
      const itemRef = doc(db, 'listings', 'listings', 'active', itemId);
      const itemDoc = await getDoc(itemRef);
      if (itemDoc.exists()) {
        const currentTotalBids = itemDoc.data().totalBids || 0;
        await updateDoc(itemRef, {
          totalBids: currentTotalBids + 1,
          updatedAt: new Date().toISOString()
        });
      }
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding bid:', error);
      throw error;
    }
  }

  // Get all bidders for an item
  static async getBiddersForItem(itemId) {
    try {
      const biddersRef = collection(db, 'listings', 'listings', 'active', itemId, 'bidders');
      const q = query(biddersRef, orderBy('bidAmount', 'desc'), orderBy('bidTime', 'asc'));
      const querySnapshot = await getDocs(q);
      
      const bidders = [];
      querySnapshot.forEach((doc) => {
        bidders.push(Bidder.fromFirestore(doc));
      });
      
      return bidders;
    } catch (error) {
      console.error('Error getting bidders:', error);
      throw error;
    }
  }

  // Get the highest bid for an item
  static async getHighestBid(itemId) {
    try {
      const bidders = await this.getBiddersForItem(itemId);
      return bidders.length > 0 ? bidders[0] : null;
    } catch (error) {
      console.error('Error getting highest bid:', error);
      throw error;
    }
  }

  // Update winning status for bidders
  static async updateWinningStatus(itemId, newWinningBidderId) {
    try {
      const biddersRef = collection(db, 'listings', 'listings', 'active', itemId, 'bidders');
      const querySnapshot = await getDocs(biddersRef);
      
      const updatePromises = [];
      querySnapshot.forEach((docSnap) => {
        const isWinning = docSnap.id === newWinningBidderId;
        updatePromises.push(
          updateDoc(doc(db, 'listings', 'listings', 'active', itemId, 'bidders', docSnap.id), {
            isWinning: isWinning
          })
        );
      });
      
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error updating winning status:', error);
      throw error;
    }
  }

  // Get bidding history for a specific user
  static async getUserBiddingHistory(userId) {
    try {
      // This would require a more complex query structure
      // For now, we'll implement a basic version
      // In a production app, you might want to maintain a separate user_bids collection
      console.log('Getting bidding history for user:', userId);
      // Implementation would depend on your specific needs
      return [];
    } catch (error) {
      console.error('Error getting user bidding history:', error);
      throw error;
    }
  }

  // Validate a new bid
  static async validateBid(itemId, newBidAmount) {
    const errors = [];
    
    if (!newBidAmount || isNaN(parseFloat(newBidAmount)) || parseFloat(newBidAmount) <= 0) {
      errors.push('Bid amount must be a valid number greater than 0');
    }
    
    try {
      // Get the item to check starting bid
      const itemRef = doc(db, 'listings', 'listings', 'active', itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        errors.push('Item not found');
        return errors;
      }
      
      const itemData = itemDoc.data();
      const startingBid = itemData.startingBid;
      
      // Get the current highest bid
      const currentHighestBid = await this.getHighestBid(itemId);
      
      const bidAmount = parseFloat(newBidAmount);
      const minimumBid = currentHighestBid ? currentHighestBid.bidAmount : startingBid;
      
      if (bidAmount <= minimumBid) {
        errors.push(`Bid must be higher than current bid of $${minimumBid.toFixed(2)}`);
      }
      
    } catch (error) {
      console.error('Error validating bid:', error);
      errors.push('Error validating bid');
    }
    
    return errors;
  }
}

export default BidderService;
