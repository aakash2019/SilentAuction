// screens/admin/ListingsScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  Image,
  FlatList,
  ActivityIndicator,
  Alert
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../../constants/Colors';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../../../firebase';
import Item from '../../../models/Item';
import NotificationService from '../../../services/NotificationService';

export default function ListingsScreen({ route }) {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState(route?.params?.initialTab || 'Active');
  const [activeItems, setActiveItems] = useState([]);
  const [soldItems, setSoldItems] = useState([]);
  const [expiredItems, setExpiredItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const tabs = ['Active', 'Sold', 'Expired'];

  // Check and transfer expired items
  const checkAndTransferExpiredItems = async () => {
    try {
      const currentTime = new Date();
      const activeCollection = collection(db, 'listings', 'listings', 'active');
      const activeSnapshot = await getDocs(activeCollection);
      
      const expiredItems = [];
      
      for (const itemDoc of activeSnapshot.docs) {
        const itemData = itemDoc.data();
        const itemId = itemDoc.id;
        
        // Check if item has expired
        const expiresAt = new Date(itemData.expiresAt);
        if (expiresAt <= currentTime) {
          expiredItems.push({ id: itemId, data: itemData });
        }
      }
      
      // Transfer expired items
      for (const expiredItem of expiredItems) {
        await transferItemToExpired(expiredItem.id, expiredItem.data);
      }
      
      if (expiredItems.length > 0) {
        
      }
      
    } catch (error) {
      
    }
  };

  // Transfer item from active to expired
  const transferItemToExpired = async (itemId, itemData) => {
    try {
      
      // 1. Add item to expired collection with updated status
      const expiredItemData = {
        ...itemData,
        status: 'expired',
        expiredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'listings', 'listings', 'expired', itemId), expiredItemData);
      
      // 2. Transfer bidders subcollection
      const biddersCollection = collection(db, 'listings', 'listings', 'active', itemId, 'bidders');
      const biddersSnapshot = await getDocs(biddersCollection);
      
      const bidderUserIds = [];
      
      // Copy bidders to expired item
      for (const bidderDoc of biddersSnapshot.docs) {
        const bidderData = bidderDoc.data();
        const bidderId = bidderDoc.id;
        bidderUserIds.push(bidderId);
        
        await setDoc(
          doc(db, 'listings', 'listings', 'expired', itemId, 'bidders', bidderId),
          bidderData
        );
        
        // Delete bidder from active item
        await deleteDoc(doc(db, 'listings', 'listings', 'active', itemId, 'bidders', bidderId));
      }
      
      // 3. Update user bid records - move from active to past with won status and send notifications
      const topBidderId = itemData.topBidder;
      const winningBid = itemData.topBidAmount || 0;
      
      
      for (const userId of bidderUserIds) {
        try {
          // Check if user has this item in their active bids
          const userActiveBidDoc = doc(db, 'users', userId, 'active', itemId);
          const userActiveBidSnapshot = await getDoc(userActiveBidDoc);
          
          if (userActiveBidSnapshot.exists()) {
            // Determine if this user won (only if there's a valid top bidder)
            const isWinner = topBidderId && userId === topBidderId;
            
            // Add to user's past bids with won status
            const pastBidData = {
              ...userActiveBidSnapshot.data(),
              won: isWinner,
              expiredAt: new Date().toISOString(),
              status: 'expired',
              finalBid: winningBid
            };
            
            await setDoc(doc(db, 'users', userId, 'past', itemId), pastBidData);
            
            // Send appropriate notification
            try {
              
              if (isWinner) {
                
                await NotificationService.createWinNotification(
                  userId,
                  itemId,
                  itemData.itemName,
                  winningBid
                );
                
              } else {
                
                await NotificationService.createLoseNotification(
                  userId,
                  itemId,
                  itemData.itemName,
                  winningBid
                );
                
              }
            } catch (notificationError) {
              // Don't fail the transfer if notification fails
            }
            
            // Remove from user's active bids
            await deleteDoc(userActiveBidDoc);
          }
        } catch (userError) {
          
        }
      }
      
      // 4. Delete item from active collection (after all subcollections are handled)
      await deleteDoc(doc(db, 'listings', 'listings', 'active', itemId));
      
      
    } catch (error) {
      
      throw error;
    }
  };

  // Function to manually mark an item as sold and send win notification
  const markItemAsSold = async (itemId) => {
    try {
      
      // Get item data from active collection
      const itemDoc = await getDoc(doc(db, 'listings', 'listings', 'active', itemId));
      if (!itemDoc.exists()) {
        throw new Error('Item not found in active collection');
      }
      
      const itemData = itemDoc.data();
      const topBidderId = itemData.topBidder;
      const winningBid = itemData.topBidAmount || 0;
      
      if (!topBidderId) {
        Alert.alert('No Winner', 'This item has no bids and cannot be marked as sold.');
        return;
      }
      
      // 1. Add item to sold collection with sold timestamp
      const soldItemData = {
        ...itemData,
        soldAt: new Date().toISOString(),
        status: 'sold'
      };
      await setDoc(doc(db, 'listings', 'listings', 'sold', itemId), soldItemData);
      
      // 2. Get all bidders for this item
      const biddersSnapshot = await getDocs(collection(db, 'listings', 'listings', 'active', itemId, 'bidders'));
      const bidderUserIds = biddersSnapshot.docs.map(doc => doc.id);
      
      // 3. Transfer bidders subcollection to sold item
      for (const bidderId of bidderUserIds) {
        const bidderDoc = await getDoc(doc(db, 'listings', 'listings', 'active', itemId, 'bidders', bidderId));
        if (bidderDoc.exists()) {
          await setDoc(doc(db, 'listings', 'listings', 'sold', itemId, 'bidders', bidderId), bidderDoc.data());
        }
        // Delete from active bidders
        await deleteDoc(doc(db, 'listings', 'listings', 'active', itemId, 'bidders', bidderId));
      }
      
      // 4. Update user bid records and send notifications
      
      for (const userId of bidderUserIds) {
        try {
          // Check if user has this item in their active bids
          const userActiveBidDoc = doc(db, 'users', userId, 'active', itemId);
          const userActiveBidSnapshot = await getDoc(userActiveBidDoc);
          
          if (userActiveBidSnapshot.exists()) {
            // Determine if this user won
            const isWinner = userId === topBidderId;
            
            // Add to user's past bids with won status
            const pastBidData = {
              ...userActiveBidSnapshot.data(),
              won: isWinner,
              soldAt: new Date().toISOString(),
              status: 'sold',
              finalBid: winningBid
            };
            
            await setDoc(doc(db, 'users', userId, 'past', itemId), pastBidData);
            
            // Send appropriate notification
            try {
              
              if (isWinner) {
                
                await NotificationService.createWinNotification(
                  userId,
                  itemId,
                  itemData.itemName,
                  winningBid
                );
                
              } else {
                
                await NotificationService.createLoseNotification(
                  userId,
                  itemId,
                  itemData.itemName,
                  winningBid
                );
                
              }
            } catch (notificationError) {
              
            }
            
            // Remove from user's active bids
            await deleteDoc(userActiveBidDoc);
          }
        } catch (userError) {
          
        }
      }
      
      // 5. Delete item from active collection
      await deleteDoc(doc(db, 'listings', 'listings', 'active', itemId));
      
      
      Alert.alert('Success', `Item "${itemData.itemName}" has been marked as sold and the winner has been notified!`);
      
      // Refresh the items list
      fetchItems();
      
    } catch (error) {
      
      Alert.alert('Error', 'Failed to mark item as sold. Please try again.');
    }
  };

  // Fetch items from Firestore
  const fetchItems = async () => {
    setIsLoading(true);
    try {
      // First check and transfer any expired items
      await checkAndTransferExpiredItems();
      
      // Fetch active items
      const activeCollection = collection(db, 'listings', 'listings', 'active');
      const activeSnapshot = await getDocs(activeCollection);
      const activeItemsList = activeSnapshot.docs.map(doc => Item.fromFirestore(doc));
      setActiveItems(activeItemsList);

      // Fetch sold items
      const soldCollection = collection(db, 'listings', 'listings', 'sold');
      const soldSnapshot = await getDocs(soldCollection);
      const soldItemsList = soldSnapshot.docs.map(doc => Item.fromFirestore(doc));
      setSoldItems(soldItemsList);

      // Fetch expired items
      const expiredCollection = collection(db, 'listings', 'listings', 'expired');
      const expiredSnapshot = await getDocs(expiredCollection);
      const expiredItemsList = expiredSnapshot.docs.map(doc => Item.fromFirestore(doc));
      setExpiredItems(expiredItemsList);

    } catch (error) {
      
      Alert.alert('Error', 'Failed to load listings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch items when component mounts and when screen is focused
  useEffect(() => {
    fetchItems();
    
    // Set up interval to check for expired items every 5 minutes
    const intervalId = setInterval(() => {
      checkAndTransferExpiredItems();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(intervalId);
  }, []);

  // Update active tab when route params change
  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);

  useFocusEffect(
    React.useCallback(() => {
      fetchItems();
    }, [])
  );

  // Get current items based on active tab
  const getCurrentItems = () => {
    switch (activeTab) {
      case 'Active':
        return activeItems;
      case 'Sold':
        return soldItems;
      case 'Expired':
        return expiredItems;
      default:
        return activeItems;
    }
  };

  const handleAddListing = () => {
    // Navigate to add listing screen
    navigation.navigate('AddItemScreen');
  };

  const handleRefreshExpired = async () => {
    setIsLoading(true);
    try {
      await checkAndTransferExpiredItems();
      await fetchItems();
      Alert.alert('Success', 'Checked for expired items and updated listings.');
    } catch (error) {
      
      Alert.alert('Error', 'Failed to refresh expired items.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleListingPress = (item) => {
    // Navigate to listing details
    
    navigation.navigate('ItemScreen', { item });
  };

  const renderTabButton = (tab) => (
    <TouchableOpacity
      key={tab}
      style={[
        styles.tabButton,
        activeTab === tab && styles.activeTabButton
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[
        styles.tabButtonText,
        activeTab === tab && styles.activeTabButtonText
      ]}>
        {tab}
      </Text>
      <View style={styles.tabCount}>
        <Text style={[
          styles.tabCountText,
          activeTab === tab && styles.activeTabCountText
        ]}>
          {tab === 'Active' ? activeItems.length : 
           tab === 'Sold' ? soldItems.length : 
           expiredItems.length}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderListingItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.listingItem}
      onPress={() => handleListingPress(item)}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={
            item.photos && item.photos.length > 0 
              ? { uri: item.photos[0] }
              : require('../../../assets/icon.png')
          } 
          style={styles.listingImage} 
        />
      </View>
      <View style={styles.listingContent}>
        <Text style={styles.listingTitle}>{item.itemName}</Text>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.startingBid}>Starting Bid: ${item.startingBid.toFixed(2)}</Text>
        <Text style={styles.totalBids}>{item.totalBids} bids</Text>
        {activeTab === 'Active' && (
          <Text style={styles.timeRemaining}>{item.getTimeRemaining()}</Text>
        )}
        
        {/* Mark as Sold button for active items with bids */}
        {activeTab === 'Active' && item.topBidder && item.totalBids > 0 && (
          <TouchableOpacity
            style={styles.markSoldButton}
            onPress={(e) => {
              e.stopPropagation(); // Prevent triggering the main item press
              Alert.alert(
                'Mark as Sold',
                `Mark "${item.itemName}" as sold? The winner will be notified.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Mark as Sold', 
                    style: 'destructive',
                    onPress: () => markItemAsSold(item.id)
                  }
                ]
              );
            }}
          >
            <Ionicons name="checkmark-circle" size={16} color={Colors.BACKGROUND_WHITE} />
            <Text style={styles.markSoldButtonText}>Mark as Sold</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.statusContainer}>
        <View style={[
          styles.statusBadge,
          { backgroundColor: 
            activeTab === 'Active' ? Colors.PRIMARY_GREEN :
            activeTab === 'Sold' ? '#4CAF50' :
            '#FF9800'
          }
        ]}>
          <Text style={styles.statusText}>{activeTab}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name={
          activeTab === 'Active' ? 'time-outline' :
          activeTab === 'Sold' ? 'checkmark-circle-outline' :
          'close-circle-outline'
        } 
        size={64} 
        color={Colors.TEXT_GRAY} 
      />
      <Text style={styles.emptyStateTitle}>
        No {activeTab.toLowerCase()} listings
      </Text>
      <Text style={styles.emptyStateSubtitle}>
        {activeTab === 'Active' 
          ? 'Add new items to start auctions'
          : `No ${activeTab.toLowerCase()} items found`
        }
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Refresh Button */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Listings</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={handleRefreshExpired}
          disabled={isLoading}
        >
          <Ionicons 
            name="refresh" 
            size={20} 
            color={isLoading ? Colors.TEXT_GRAY : Colors.PRIMARY_GREEN} 
          />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {tabs.map(renderTabButton)}
      </View>

      {/* Loading State */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.PRIMARY_GREEN} />
          <Text style={styles.loadingText}>Loading listings...</Text>
        </View>
      ) : (
        <>
          {/* Listings List */}
          {getCurrentItems().length > 0 ? (
            <FlatList
              data={getCurrentItems()}
              renderItem={renderListingItem}
              keyExtractor={(item) => item.id.toString()}
              style={styles.listContainer}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              refreshing={isLoading}
              onRefresh={fetchItems}
            />
          ) : (
            renderEmptyState()
          )}
        </>
      )}

      {/* Floating Action Button - Only show for Active tab */}
      {activeTab === 'Active' && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={handleAddListing}
        >
          <Ionicons name="add" size={24} color={Colors.WHITE} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND_WHITE,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.TEXT_BLACK,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.BACKGROUND_WHITE,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  activeTabButton: {
    backgroundColor: Colors.PRIMARY_GREEN,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginRight: 6,
  },
  activeTabButtonText: {
    color: Colors.WHITE,
  },
  tabCount: {
    backgroundColor: Colors.WHITE,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  tabCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
  },
  activeTabCountText: {
    color: Colors.PRIMARY_GREEN,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.TEXT_GRAY,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 100, // Space for FAB
  },
  listingItem: {
    flexDirection: 'row',
    backgroundColor: Colors.BACKGROUND_WHITE,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: Colors.TEXT_BLACK,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    marginRight: 15,
    overflow: 'hidden',
  },
  listingImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  listingContent: {
    flex: 1,
    justifyContent: 'center',
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginBottom: 4,
  },
  category: {
    fontSize: 12,
    color: Colors.TEXT_GRAY,
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  startingBid: {
    fontSize: 14,
    color: Colors.PRIMARY_GREEN,
    fontWeight: '600',
    marginBottom: 2,
  },
  totalBids: {
    fontSize: 12,
    color: Colors.TEXT_GRAY,
    marginBottom: 2,
  },
  timeRemaining: {
    fontSize: 12,
    color: Colors.TEXT_BLACK,
    fontWeight: '500',
  },
  markSoldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  markSoldButtonText: {
    fontSize: 11,
    color: Colors.BACKGROUND_WHITE,
    fontWeight: '600',
    marginLeft: 4,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.WHITE,
    textTransform: 'uppercase',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.PRIMARY_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.TEXT_BLACK,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});
