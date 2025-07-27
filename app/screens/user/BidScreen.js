// screens/user/BidScreen.js
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
import { Colors } from '../../constants/Colors';
import { auth, db } from '../../firebase';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';

export default function BidScreen() {
  const [activeTab, setActiveTab] = useState('active');
  const [activeBids, setActiveBids] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userBiddingItems, setUserBiddingItems] = useState([]);
  const [pastBids, setPastBids] = useState([]);

  const navigation = useNavigation();

  // Fetch active listings where user has placed bids
  const fetchUserActiveBids = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setIsLoading(false);
        return;
      }


      // Get all item IDs from user's active collection
      const activeUserQuery = query(
        collection(db, `users/${user.uid}/active`)
      );

      const activeUserSnapshot = await getDocs(activeUserQuery);
      const userBids = [];

      // For each item ID, fetch the full item data from listings/listings/active
      for (const userDoc of activeUserSnapshot.docs) {
        const itemId = userDoc.id; // Document ID is the item ID
        
        try {
          // Get item data from active listings
          const itemDoc = await getDoc(doc(db, 'listings/listings/active', itemId));
          
          if (itemDoc.exists()) {
            const itemData = { id: itemDoc.id, ...itemDoc.data() };
            
            // Get user's bid information from the item's bidders subcollection
            const biddersQuery = query(
              collection(db, `listings/listings/active/${itemId}/bidders`),
              orderBy('bidAmount', 'desc')
            );
            
            const biddersSnapshot = await getDocs(biddersQuery);
            let userBid = null;
            let highestBid = null;
            let userBidAmount = 0;
            let isHighestBidder = false;

            biddersSnapshot.forEach((bidderDoc) => {
              const bidderData = bidderDoc.data();
              
              // Store highest bid
              if (!highestBid) {
                highestBid = bidderData;
              }
              
              // Check if this is the current user's bid
              if (bidderData.userId === user.uid || bidderData.bidderId === user.uid) {
                userBid = { id: bidderDoc.id, ...bidderData };
                userBidAmount = bidderData.bidAmount;
                
                // Check if user is the highest bidder
                if (highestBid && bidderData.bidAmount === highestBid.bidAmount) {
                  isHighestBidder = true;
                }
              }
            });

            // Add item to user's active bids list
            userBids.push({
              ...itemData,
              userBid: userBid,
              userBidAmount: userBidAmount,
              highestBid: highestBid ? highestBid.bidAmount : itemData.startingBid,
              isHighestBidder: isHighestBidder,
              totalBidders: biddersSnapshot.size
            });
          }
        } catch (error) {
        }
      }

      setUserBiddingItems(userBids);
      
    } catch (error) {
      Alert.alert('Error', 'Failed to load your bids. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserActiveBids();
    fetchUserPastBids();
  }, []);

  // Fetch user's past bids from users/'userId'/past collection
  const fetchUserPastBids = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        return;
      }


      try {
        // Get past bids from user's past collection
        const pastQuery = query(
          collection(db, `users/${user.uid}/past`)
        );
        
        const pastSnapshot = await getDocs(pastQuery);
        const userPastBids = [];

        // For each past bid, get the item details from listings collections
        for (const pastDoc of pastSnapshot.docs) {
          const pastBidData = pastDoc.data();
          const itemId = pastDoc.id; // Document ID is the item ID
          
          
          try {
            // Try to get item from sold collection first
            let itemDoc = await getDoc(doc(db, 'listings/listings/sold', itemId));
            let itemStatus = 'sold';
            
            // If not in sold, try expired collection
            if (!itemDoc.exists()) {
              itemDoc = await getDoc(doc(db, 'listings/listings/expired', itemId));
              itemStatus = 'expired';
            }
            
            if (itemDoc.exists()) {
              const itemData = itemDoc.data();
              
              // Get user's bid amount from the item's bidders subcollection
              let userBidAmount = 0;
              let finalBidAmount = itemData.finalBidAmount || 0;
              
              try {
                const bidderDoc = await getDoc(doc(db, `listings/listings/${itemStatus}/${itemId}/bidders`, user.uid));
                if (bidderDoc.exists()) {
                  userBidAmount = bidderDoc.data().bidAmount || 0;
                }
              } catch (bidderError) {
              }
              
              const isWinner = pastBidData.won === true; // Use the 'won' field from user's past collection
              
              
              userPastBids.push({
                id: itemId,
                itemName: itemData.itemName,
                photos: itemData.photos || [],
                category: itemData.category,
                description: itemData.description,
                startingBid: itemData.startingBid,
                userBidAmount: userBidAmount,
                winningBidAmount: finalBidAmount,
                isWinner: isWinner,
                status: itemStatus,
                completedAt: itemData.soldAt || itemData.updatedAt || itemData.expiresAt
              });
            }
          } catch (error) {
          }
        }

        setPastBids(userPastBids);
        
      } catch (collectionError) {
        // If past collection doesn't exist, it will throw an error
        setPastBids([]);
      }
      
    } catch (error) {
      setPastBids([]);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    if (activeTab === 'active') {
      await fetchUserActiveBids();
    } else {
      await fetchUserPastBids();
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUserActiveBids();
  }, []);

  const handleTabPress = (tab) => {
    setActiveTab(tab);
    // If switching to past tab and haven't loaded past bids yet, fetch them
    if (tab === 'past' && pastBids.length === 0) {
      fetchUserPastBids();
    }
  };

  const handleBidPress = (item) => {
    // Handle both Firebase items and mock data
    const isFirebaseItem = item.itemName !== undefined;
    
    if (isFirebaseItem) {
      // Navigate to UserItemScreen with the item data
      navigation.navigate('UserItemScreen', { 
        item: {
          id: item.id,
          itemName: item.itemName,
          photos: item.photos,
          category: item.category,
          description: item.description,
          startingBid: item.startingBid,
          topBidAmount: item.highestBid || item.winningBidAmount,
          topBidder: item.isHighestBidder || item.isWinner ? auth.currentUser?.uid : null,
          expiresAt: item.expiresAt || item.completedAt,
          totalBids: item.totalBidders || 0,
          status: item.status || 'active'
        }
      });
    } else {
      // For legacy mock data, just log for now
    }
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const renderBidItem = ({ item }) => {
    // Handle both Firebase items and mock data
    const isFirebaseItem = item.itemName !== undefined;
    const title = isFirebaseItem ? item.itemName : item.title;
    const image = isFirebaseItem && item.photos && item.photos.length > 0 
      ? { uri: item.photos[0] } 
      : require('../../assets/icon.png');
    
    return (
      <TouchableOpacity 
        style={styles.bidItem}
        onPress={() => handleBidPress(item)}
      >
        <View style={styles.bidImageContainer}>
          <Image source={image} style={styles.bidImage} />
        </View>
        <View style={styles.bidContent}>
          <Text style={styles.bidTitle}>{title}</Text>
          {isFirebaseItem ? (
            activeTab === 'active' ? (
              // Active bids display
              <>
                <Text style={styles.bidAmount}>
                  Your Bid: {formatCurrency(item.userBidAmount)}
                </Text>
                <Text style={styles.highestBidAmount}>
                  Highest Bid: {formatCurrency(item.highestBid)}
                </Text>
                {item.isHighestBidder && (
                  <Text style={styles.winningBadge}>🏆 Winning!</Text>
                )}
                <Text style={styles.bidInfo}>
                  {item.totalBidders} bidder{item.totalBidders !== 1 ? 's' : ''}
                </Text>
              </>
            ) : (
              // Past bids display
              <>
                <Text style={styles.bidAmount}>
                  Your Bid: {formatCurrency(item.userBidAmount)}
                </Text>
                <Text style={styles.highestBidAmount}>
                  Winning Bid: {formatCurrency(item.winningBidAmount)}
                </Text>
                {item.isWinner ? (
                  <Text style={styles.winningBadge}>🏆 Won!</Text>
                ) : (
                  <Text style={styles.lostBadge}>❌ Lost</Text>
                )}
                <Text style={styles.bidInfo}>
                  {item.status === 'sold' ? 'Sold' : 'Expired'}
                </Text>
              </>
            )
          ) : (
            <Text style={styles.bidAmount}>Current Bid: {item.currentBid}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const currentData = activeTab === 'active' ? userBiddingItems : pastBids;

  return (
    <SafeAreaView style={styles.container}>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => handleTabPress('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Active Bids
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => handleTabPress('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Past Bids
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bids List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.PRIMARY_GREEN} />
          <Text style={styles.loadingText}>Loading your bids...</Text>
        </View>
      ) : currentData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>
            {activeTab === 'active' ? 'No Active Bids' : 'No Past Bids'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'active' 
              ? 'You haven\'t placed any bids yet. Start bidding on items!' 
              : 'Your past bids will appear here.'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={currentData}
          renderItem={renderBidItem}
          keyExtractor={(item) => item.id.toString()}
          style={styles.listContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshing={isLoading}
          onRefresh={handleRefresh}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND_WHITE,
  },
  titleContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  activeTab: {
    borderBottomColor: Colors.PRIMARY_GREEN,
  },
  tabText: {
    fontSize: 16,
    color: Colors.TEXT_GRAY,
    fontWeight: '500',
  },
  activeTabText: {
    color: Colors.TEXT_BLACK,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  bidItem: {
    flexDirection: 'row',
    backgroundColor: Colors.BACKGROUND_WHITE,
    paddingVertical: 15,
    paddingHorizontal: 5,
    marginBottom: 15,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  bidImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    marginRight: 15,
    overflow: 'hidden',
  },
  bidImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bidContent: {
    flex: 1,
    justifyContent: 'center',
  },
  bidTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginBottom: 4,
  },
  bidAmount: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    fontWeight: '400',
  },
  highestBidAmount: {
    fontSize: 14,
    color: Colors.PRIMARY_GREEN,
    fontWeight: '600',
    marginTop: 2,
  },
  winningBadge: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
    marginTop: 4,
  },
  lostBadge: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '600',
    marginTop: 4,
  },
  bidInfo: {
    fontSize: 12,
    color: Colors.TEXT_GRAY,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.TEXT_GRAY,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    textAlign: 'center',
    lineHeight: 20,
  },
});
