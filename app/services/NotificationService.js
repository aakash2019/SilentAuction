// services/NotificationService.js
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  updateDoc, 
  doc, 
  getDoc,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

export class NotificationService {
  
  // Create a notification for when someone bids on an item
  static async createBidNotification(itemId, itemName, newBidderUserId, bidAmount) {
    try {
      console.log('Creating bid notification for item:', itemId);
      console.log('New bidder:', newBidderUserId);
      
      // Get all users who have bid on this item (excluding the new bidder)
      // Note: Now using auto-generated document IDs, so we need to check bidderId field
      const biddersCollection = collection(db, 'listings/listings/active', itemId, 'bidders');
      const biddersSnapshot = await getDocs(biddersCollection);
      
      console.log('Total bidders found:', biddersSnapshot.size);
      
      const notificationPromises = [];
      const notifiedUsers = new Set(); // Track users we've already notified
      
      // Create notifications for each previous bidder (excluding the new bidder)
      biddersSnapshot.forEach((bidderDoc) => {
        const bidderData = bidderDoc.data();
        const bidderId = bidderData.bidderId; // Use bidderId field from document data
        
        console.log('Checking bidder:', bidderId, 'vs new bidder:', newBidderUserId);
        
        // Skip the new bidder (don't notify themselves) and avoid duplicate notifications
        if (bidderId !== newBidderUserId && !notifiedUsers.has(bidderId)) {
          console.log('Creating notification for bidder:', bidderId);
          notifiedUsers.add(bidderId);
          
          const notification = {
            userId: bidderId,
            type: 'new_bid',
            title: 'New Bid Alert',
            message: `Someone placed a new bid of $${bidAmount.toFixed(2)} on "${itemName}"`,
            itemId: itemId,
            itemName: itemName,
            bidAmount: bidAmount,
            isRead: false,
            createdAt: serverTimestamp(),
            priority: 'medium'
          };
          
          notificationPromises.push(
            addDoc(collection(db, 'notifications'), notification)
          );
        } else {
          console.log('Skipping notification for new bidder (self) or already notified user');
        }
      });
      
      await Promise.all(notificationPromises);
      console.log(`Created ${notificationPromises.length} bid notifications`);
      
    } catch (error) {
      console.error('Error creating bid notification:', error);
    }
  }

  // Create a notification for when user wins an item
  static async createWinNotification(userId, itemId, itemName, winningBid) {
    try {
      console.log('Creating win notification for user:', userId);
      console.log('Item ID:', itemId);
      console.log('Item Name:', itemName);
      console.log('Winning Bid:', winningBid);
      
      if (!userId || !itemId || !itemName || winningBid === undefined || winningBid === null) {
        console.error('Missing required parameters for win notification:', {
          userId,
          itemId,
          itemName,
          winningBid
        });
        throw new Error('Missing required parameters for win notification');
      }
      
      const notification = {
        userId: userId,
        type: 'item_won',
        title: 'Congratulations! You Won!',
        message: `You won "${itemName}" with a bid of $${winningBid.toFixed(2)}!`,
        itemId: itemId,
        itemName: itemName,
        winningBid: winningBid,
        isRead: false,
        createdAt: serverTimestamp(),
        priority: 'high'
      };
      
      const docRef = await addDoc(collection(db, 'notifications'), notification);
      console.log('Win notification created successfully with ID:', docRef.id);
      
    } catch (error) {
      console.error('Error creating win notification:', error);
      throw error;
    }
  }

  // Create a notification for when user loses an item
  static async createLoseNotification(userId, itemId, itemName, finalBid) {
    try {
      console.log('Creating lose notification for user:', userId);
      
      const notification = {
        userId: userId,
        type: 'item_lost',
        title: 'Auction Ended',
        message: `The auction for "${itemName}" has ended. Final bid was $${finalBid.toFixed(2)}.`,
        itemId: itemId,
        itemName: itemName,
        finalBid: finalBid,
        isRead: false,
        createdAt: serverTimestamp(),
        priority: 'low'
      };
      
      await addDoc(collection(db, 'notifications'), notification);
      console.log('Lose notification created successfully');
      
    } catch (error) {
      console.error('Error creating lose notification:', error);
    }
  }

  // Get all notifications for a user
  static async getUserNotifications(userId) {
    try {
      // Use simple query without orderBy to avoid index requirement
      // Once you create the composite index, you can add orderBy('createdAt', 'desc')
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId)
        // orderBy('createdAt', 'desc') // Uncomment this line after creating the composite index
      );
      
      const snapshot = await getDocs(notificationsQuery);
      const notifications = [];
      
      snapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        });
      });
      
      // Sort on client side by createdAt descending (remove this after enabling orderBy)
      return notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  // Get unread notifications count
  static async getUnreadCount(userId) {
    try {
      const unreadQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('isRead', '==', false)
      );
      
      const snapshot = await getDocs(unreadQuery);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId) {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        isRead: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId) {
    try {
      const unreadQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('isRead', '==', false)
      );
      
      const snapshot = await getDocs(unreadQuery);
      const updatePromises = [];
      
      snapshot.forEach((doc) => {
        updatePromises.push(
          updateDoc(doc.ref, { isRead: true })
        );
      });
      
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  // Listen to real-time notifications
  static subscribeToNotifications(userId, callback) {
    // For now, use the simple query without orderBy to avoid index requirement
    // Once you create the composite index, you can switch back to the orderBy version
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId)
      // orderBy('createdAt', 'desc') // Uncomment this line after creating the composite index
    );
    
    return onSnapshot(notificationsQuery, (snapshot) => {
      const notifications = [];
      snapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        });
      });
      
      // Sort on client side by createdAt descending (remove this after enabling orderBy)
      const sortedNotifications = notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      callback(sortedNotifications);
    }, (error) => {
      console.error('Notification listener error:', error);
      callback([]); // Return empty array on error
    });
  }

  // Helper function to format notification time
  static formatNotificationTime(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  // Get notification icon based on type
  static getNotificationIcon(type) {
    switch (type) {
      case 'new_bid':
        return 'trending-up';
      case 'item_won':
        return 'trophy';
      case 'item_lost':
        return 'time';
      default:
        return 'notifications';
    }
  }

  // Get notification color based on priority
  static getNotificationColor(priority) {
    switch (priority) {
      case 'high':
        return '#4CAF50'; // Green for wins
      case 'medium':
        return '#FF9800'; // Orange for new bids
      case 'low':
        return '#757575'; // Gray for losses
      default:
        return '#2196F3'; // Blue default
    }
  }
}

export default NotificationService;
