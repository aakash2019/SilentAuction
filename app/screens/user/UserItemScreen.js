// screens/user/UserItemScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
  TextInput
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants/Colors';
import { useNavigation, useRoute } from '@react-navigation/native';
import { collection, getDocs, query, orderBy, doc, setDoc, updateDoc, addDoc, getDoc, increment } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import NotificationService from '../../services/NotificationService';

const { width } = Dimensions.get('window');

export default function UserItemScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { item: routeItem } = route.params;

  const [item, setItem] = useState(routeItem);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showBiddersModal, setShowBiddersModal] = useState(false);
  const [bidders, setBidders] = useState([]);
  const [isLoadingBidders, setIsLoadingBidders] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [showBidModal, setShowBidModal] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [userIsTopBidder, setUserIsTopBidder] = useState(false);
  const [topBidAmount, setTopBidAmount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Determine photos array - handle both single photo and array
  const photos = item?.photos 
    ? (Array.isArray(item.photos) ? item.photos : [item.photos])
    : [null];

  // Fetch bidders from Firestore
  const fetchBidders = async () => {
    if (!item?.id) return;
    
    setIsLoadingBidders(true);
    try {
      // Get the collection path based on item status
      let collectionPath;
      if (item.status === 'active') {
        collectionPath = `listings/listings/active/${item.id}/bidders`;
      } else if (item.status === 'sold') {
        collectionPath = `listings/listings/sold/${item.id}/bidders`;
      } else {
        collectionPath = `listings/listings/expired/${item.id}/bidders`;
      }

      const biddersQuery = query(
        collection(db, collectionPath),
        orderBy('bidAmount', 'desc')
      );

      const querySnapshot = await getDocs(biddersQuery);
      const biddersData = [];

      // Fetch bid data and corresponding user information
      for (const docSnapshot of querySnapshot.docs) {
        const bidData = { id: docSnapshot.id, ...docSnapshot.data() };
        
        try {
          // Fetch user information using the bidderId
          const userDocRef = doc(db, 'users', bidData.bidderId);
          const userDocSnapshot = await getDoc(userDocRef);
          
          if (userDocSnapshot.exists()) {
            const userData = userDocSnapshot.data();
            biddersData.push({
              ...bidData,
              fullName: userData.fullName || userData.displayName || userData.name || 'Anonymous User',
              email: userData.email || 'no-email@example.com',
              profileImage: userData.profileImage || null
            });
          } else {
            // Fallback if user document doesn't exist
            biddersData.push({
              ...bidData,
              fullName: 'Unknown User',
              email: 'unknown@example.com',
              profileImage: null
            });
          }
        } catch (userError) {
          // Fallback with minimal data
          biddersData.push({
            ...bidData,
            fullName: 'Anonymous User',
            email: 'anonymous@example.com',
            profileImage: null
          });
        }
      }

      setBidders(biddersData);
      
      // Calculate top bid amount and check if current user is top bidder
      if (biddersData.length > 0) {
        const topBid = biddersData[0];
        
        setTopBidAmount(topBid.bidAmount);
        // Check if current user is actually the top bidder
        setUserIsTopBidder(topBid.bidderId === currentUserId);
      } else {
        // No bids yet - set starting bid as top bid and user is not top bidder
        setTopBidAmount(item?.startingBid || 0);
        setUserIsTopBidder(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load bidders information.');
    } finally {
      setIsLoadingBidders(false);
    }
  };

  // Calculate time remaining with seconds
  const calculateTimeRemaining = () => {
    // Check if item is sold first
    if (item?.status === 'sold') {
      return { text: 'Item Sold', expired: true, sold: true };
    }
    
    // Check if item is expired
    if (item?.status === 'expired') {
      return { text: 'Expired', expired: true };
    }

    if (!item?.expiresAt) return { text: 'No expiry date', expired: true };

    try {
      const expiryDate = new Date(item.expiresAt);
      const now = new Date();
      const timeDiff = expiryDate.getTime() - now.getTime();

      if (timeDiff <= 0) {
        return { text: 'Expired', expired: true };
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

      return {
        text: `${days}d ${hours}h ${minutes}m ${seconds}s`,
        days,
        hours,
        minutes,
        seconds,
        expired: false
      };
    } catch (error) {
      return { text: 'Unknown', expired: true };
    }
  };

  // Listen for authentication state changes to get real user UID
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserId(user.uid);
      } else {
        setCurrentUserId(null); 
      }
    });

    return () => unsubscribe();
  }, []);

  // Update timer every second for live countdown
  useEffect(() => {
    const updateTimer = () => {
      setTimeRemaining(calculateTimeRemaining());
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000); // Update every second

    return () => clearInterval(interval);
  }, [item?.expiresAt]);

  // Fetch bidders when component mounts or currentUserId changes
  useEffect(() => {
    if (currentUserId && item?.id) {
      fetchBidders();
    }
  }, [item?.id, currentUserId]);

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleBidPress = () => {
    if (!currentUserId) {
      Alert.alert('Authentication Required', 'Please sign in to place a bid.');
      return;
    }
    
    if (userIsTopBidder) {
      Alert.alert(
        'Top Bidder',
        'You are currently the top bidder for this item!',
        [{ text: 'OK', style: 'default' }]
      );
    } else {
      setShowBidModal(true);
      setBidAmount('');
    }
  };

  const handlePlaceBid = async () => {
    const bidValue = parseFloat(bidAmount);
    
    // Check if user is authenticated
    if (!currentUserId) {
      Alert.alert('Authentication Required', 'Please sign in to place a bid.');
      return;
    }
    
    // Validation
    if (!bidAmount || isNaN(bidValue)) {
      Alert.alert('Invalid Bid', 'Please enter a valid bid amount.');
      return;
    }
    
    // Use starting bid as minimum if no bids exist, otherwise use top bid amount
    const minimumBid = bidders.length > 0 ? topBidAmount : (item?.startingBid || 0);
    
    if (bidValue <= minimumBid) {
      const minimumBidMessage = bidders.length > 0 
        ? `Your bid must be higher than the current top bid of ${formatCurrency(minimumBid)}.`
        : `Your bid must be higher than the starting bid of ${formatCurrency(minimumBid)}.`;
      Alert.alert('Invalid Bid', minimumBidMessage);
      return;
    }
    
    setIsPlacingBid(true);
    
    try {
      // Ensure user document exists before placing bid
      await ensureUserDocument(currentUserId);
      
      // Check if user already has a bid on this item (for totalBids counting)
      const existingBidsQuery = query(
        collection(db, `listings/listings/active/${item.id}/bidders`),
        orderBy('bidAmount', 'desc')
      );
      const existingBidsSnapshot = await getDocs(existingBidsQuery);
      
      // Check if this user has bid before
      let userHasBidBefore = false;
      existingBidsSnapshot.forEach((doc) => {
        const bidData = doc.data();
        if (bidData.bidderId === currentUserId) {
          userHasBidBefore = true;
        }
      });
      
      const isNewBid = !userHasBidBefore;
      
      // Store bid data in bidders collection with auto-generated document ID
      const bidData = {
        bidderId: currentUserId,
        bidAmount: bidValue,
        bidAt: new Date().toISOString()
      };
      
      // Add bid to the bidders collection with auto-generated ID
      await addDoc(collection(db, `listings/listings/active/${item.id}/bidders`), bidData);
      
      // Update item with new top bidder info and increment total bids (only if it's a new bid)
      const itemRef = doc(db, 'listings/listings/active', item.id);
      const updateData = {
        topBidder: currentUserId,
        topBidAmount: bidValue
      };
      
      // Only increment totalBids if this is a new bid from this user
      if (isNewBid) {
        updateData.totalBids = increment(1);
      }
      
      await updateDoc(itemRef, updateData);
      
      // Create notification for other bidders
      try {
        await NotificationService.createBidNotification(
          item.id,
          item.itemName,
          currentUserId,
          bidValue
        );
      } catch (notificationError) {
        // Don't fail the bid if notification fails
      }
      
      // Add minimal data to user's active bids collection with itemId as document ID
      await setDoc(doc(db, `users/${currentUserId}/active`, item.id), {
        itemId: item.id
      });
      
      // Refresh bidders data
      await fetchBidders();
      
      setShowBidModal(false);
      setBidAmount('');
      
      Alert.alert('Success', 'Your bid has been placed successfully!');
      
    } catch (error) {
      Alert.alert('Error', 'Failed to place bid. Please try again.');
    } finally {
      setIsPlacingBid(false);
    }
  };

  const handleImageScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.floor(event.nativeEvent.contentOffset.x / slideSize);
    setCurrentImageIndex(index);
  };

  const getTopBidder = () => {
    if (bidders.length === 0) return null;
    return bidders[0]; // Already sorted by highest bid
  };

  const topBidder = getTopBidder();

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  // Helper function to ensure user document exists
  const ensureUserDocument = async (userId) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDocSnapshot = await getDoc(userDocRef);
      
      if (!userDocSnapshot.exists()) {
        // Create user document with basic info from auth
        const userData = {
          fullName: auth.currentUser?.displayName || 'Anonymous User',
          email: auth.currentUser?.email || 'no-email@example.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await setDoc(userDocRef, userData);
      }
    } catch (error) {
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const renderBidderItem = ({ item: bidder, index }) => {
    const isCurrentUser = bidder.bidderId === currentUserId;
    const isTopBidder = index === 0; // First item is top bidder (sorted by highest amount)
    
    // Determine display name
    const displayName = isCurrentUser ? (bidder.fullName || 'You') : 'Anonymous';
    
    // Determine bid amount color
    let bidAmountColor;
    if (isTopBidder) {
      bidAmountColor = '#FF6B6B'; // Red for top bid
    } else if (isCurrentUser) {
      bidAmountColor = Colors.USER_BID_YELLOW; // Yellow for current user's other bids
    } else {
      bidAmountColor = Colors.PRIMARY_GREEN; // Green for others
    }

    return (
      <View style={styles.bidderItem}>
        <View style={styles.bidderAvatar}>
          {bidder.profileImage ? (
            <Image 
              source={{ uri: bidder.profileImage }} 
              style={styles.bidderAvatarImage}
            />
          ) : (
            <Text style={styles.bidderAvatarText}>
              {isCurrentUser ? (bidder.fullName?.charAt(0)?.toUpperCase() || 'Y') : 'A'}
            </Text>
          )}
        </View>
        <View style={styles.bidderInfo}>
          <Text style={styles.bidderName}>{displayName}</Text>
          <Text style={styles.bidTime}>
            {formatDate(bidder.bidAt)}
          </Text>
        </View>
        <View style={styles.bidAmountContainer}>
          <Text style={[styles.bidAmount, { color: bidAmountColor }]}>
            {formatCurrency(bidder.bidAmount)}
          </Text>
          {isTopBidder && (
            <Text style={styles.topBidLabel}>Top Bid</Text>
          )}
        </View>
      </View>
    );
  };

  const renderBiddersModal = () => (
    <Modal
      visible={showBiddersModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowBiddersModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>All Bidders</Text>
          <TouchableOpacity
            onPress={() => setShowBiddersModal(false)}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color={Colors.TEXT_BLACK} />
          </TouchableOpacity>
        </View>

        {isLoadingBidders ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.PRIMARY_GREEN} />
            <Text style={styles.loadingText}>Loading bidders...</Text>
          </View>
        ) : bidders.length === 0 ? (
          <View style={styles.emptyBidders}>
            <Ionicons name="people-outline" size={64} color={Colors.TEXT_GRAY} />
            <Text style={styles.emptyBiddersTitle}>No Bidders Yet</Text>
            <Text style={styles.emptyBiddersSubtitle}>
              Be the first to place a bid!
            </Text>
          </View>
        ) : (
          <FlatList
            data={bidders}
            renderItem={({ item, index }) => renderBidderItem({ item, index })}
            keyExtractor={(item) => item.id}
            style={styles.biddersList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.biddersListContent}
          />
        )}
      </SafeAreaView>
    </Modal>
  );

  const renderBidModal = () => (
    <Modal
      visible={showBidModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowBidModal(false)}
    >
      <View style={styles.bidModalOverlay}>
        <View style={styles.bidModalContent}>
          <View style={styles.bidModalHeader}>
            <Text style={styles.bidModalTitle}>Place Your Bid</Text>
            <TouchableOpacity
              onPress={() => setShowBidModal(false)}
              style={styles.bidModalCloseButton}
            >
              <Ionicons name="close" size={24} color={Colors.TEXT_BLACK} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.bidModalBody}>
            <Text style={styles.currentTopBidText}>
              {bidders.length > 0 
                ? `Current Top Bid: ${formatCurrency(topBidAmount)}`
                : `Starting Bid: ${formatCurrency(item?.startingBid || 0)}`
              }
            </Text>
            
            <Text style={styles.bidInputLabel}>Your Bid Amount</Text>
            <TextInput
              style={styles.bidInput}
              value={bidAmount}
              onChangeText={setBidAmount}
              placeholder="Enter amount"
              keyboardType="numeric"
              autoFocus={true}
            />
            
            <Text style={styles.bidHint}>
              {bidders.length > 0 
                ? `Your bid must be higher than ${formatCurrency(topBidAmount)}`
                : `Your bid must be higher than ${formatCurrency(item?.startingBid || 0)}`
              }
            </Text>
          </View>
          
          <View style={styles.bidModalFooter}>
            <TouchableOpacity
              style={styles.cancelBidButton}
              onPress={() => setShowBidModal(false)}
            >
              <Text style={styles.cancelBidButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.confirmBidButton, isPlacingBid && styles.disabledButton]}
              onPress={handlePlaceBid}
              disabled={isPlacingBid}
            >
              {isPlacingBid ? (
                <ActivityIndicator size="small" color={Colors.WHITE} />
              ) : (
                <Text style={styles.confirmBidButtonText}>Place Bid</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.TEXT_BLACK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Auction Details</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Image Slider */}
        <View style={styles.imageSliderContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleImageScroll}
            scrollEventThrottle={16}
          >
            {photos.map((photo, index) => (
              <View key={index} style={styles.imageSlide}>
                <Image
                  source={
                    photo 
                      ? { uri: photo }
                      : require('../../assets/icon.png')
                  }
                  style={styles.itemImage}
                  resizeMode="cover"
                />
              </View>
            ))}
          </ScrollView>

          {/* Image Indicators */}
          {photos.length > 1 && (
            <View style={styles.imageIndicators}>
              {photos.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    index === currentImageIndex && styles.activeIndicator
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Item Information */}
        <View style={styles.itemInfoContainer}>
          {/* Title and Category */}
          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <View style={styles.titleContent}>
                <Text style={styles.itemTitle}>{item?.itemName || 'Untitled Item'}</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{item?.category || 'Uncategorized'}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Compact Info Grid */}
          <View style={styles.infoGrid}>
            {/* Starting Bid */}
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Starting Bid</Text>
              <Text style={styles.startingBidText}>
                {formatCurrency(item?.startingBid || 0)}
              </Text>
            </View>

            {/* Top Bid */}
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Top Bid</Text>
              <Text style={[
                styles.topBidText, 
                bidders.length === 0 && styles.noBidText
              ]}>
                {bidders.length > 0 ? formatCurrency(topBidAmount) : 'No Bid Yet'}
              </Text>
            </View>

            {/* Condition */}
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Condition</Text>
              <Text style={styles.conditionText}>{item?.condition || 'Not specified'}</Text>
            </View>
          </View>

          {/* Live Countdown Timer */}
          <View style={styles.timerCard}>
            <Text style={styles.timerCardLabel}>Time Remaining</Text>
            {timeRemaining?.expired ? (
              <View style={styles.expiredContainer}>
                {timeRemaining?.sold ? (
                  <>
                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                    <Text style={[styles.expiredText, { color: '#4CAF50' }]}>Item Sold</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="time-outline" size={24} color="#FF6B6B" />
                    <Text style={styles.expiredText}>Auction Expired</Text>
                  </>
                )}
              </View>
            ) : (
              <View style={styles.countdownContainer}>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeNumber}>{timeRemaining?.days || 0}</Text>
                  <Text style={styles.timeLabel}>Days</Text>
                </View>
                <Text style={styles.timeSeparator}>:</Text>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeNumber}>{timeRemaining?.hours || 0}</Text>
                  <Text style={styles.timeLabel}>Hours</Text>
                </View>
                <Text style={styles.timeSeparator}>:</Text>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeNumber}>{timeRemaining?.minutes || 0}</Text>
                  <Text style={styles.timeLabel}>Mins</Text>
                </View>
                <Text style={styles.timeSeparator}>:</Text>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeNumber}>{timeRemaining?.seconds || 0}</Text>
                  <Text style={styles.timeLabel}>Secs</Text>
                </View>
              </View>
            )}
            <Text style={styles.expiryText}>
              {timeRemaining?.sold 
                ? `Sold: ${formatDate(item?.soldAt)}` 
                : `Expires: ${formatDate(item?.expiresAt)}`}
            </Text>
          </View>

          {/* Bidders Section */}
          <TouchableOpacity 
            style={styles.biddersCard}
            onPress={() => setShowBiddersModal(true)}
          >
            <View style={styles.biddersHeader}>
              <Text style={styles.biddersTitle}>
                {(() => {
                  const totalBids = bidders.length;
                  return totalBids === 0 ? 'Bidders (No Bids Yet)' : `Bidders (${totalBids} bid${totalBids !== 1 ? 's' : ''})`;
                })()}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.TEXT_GRAY} />
            </View>
            
            {topBidder ? (
              <View style={styles.topBidderInfo}>
                <View style={styles.topBidderAvatar}>
                  {topBidder.profileImage ? (
                    <Image 
                      source={{ uri: topBidder.profileImage }} 
                      style={styles.topBidderAvatarImage}
                    />
                  ) : (
                    <Text style={styles.topBidderAvatarText}>
                      {(topBidder.bidderId === currentUserId && currentUserId && topBidder.fullName) 
                        ? topBidder.fullName.charAt(0).toUpperCase()
                        : (topBidder.bidderId === currentUserId && currentUserId)
                        ? 'Y'
                        : 'A'}
                    </Text>
                  )}
                </View>
                <View style={styles.topBidderDetails}>
                  <Text style={styles.topBidderName}>
                    {(() => {
                      const isCurrentUser = topBidder.bidderId === currentUserId && currentUserId;
                      
                      return isCurrentUser ? (topBidder.fullName || 'You') : 'Anonymous';
                    })()}
                  </Text>
                  <Text style={styles.topBidderLabel}>Highest Bidder</Text>
                </View>
                <Text style={styles.topBidderAmount}>
                  {formatCurrency(topBidder.bidAmount)}
                </Text>
              </View>
            ) : (
              <View style={styles.noBidsContainer}>
                <Ionicons name="gavel-outline" size={40} color={Colors.TEXT_GRAY} />
                <Text style={styles.noBidsText}>No bids placed yet</Text>
                <Text style={styles.noBidsSubtext}>Be the first to place a bid!</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Description */}
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionLabel}>Description</Text>
            <Text style={styles.descriptionText}>
              {item?.description || 'No description provided.'}
            </Text>
          </View>

          {/* Bid Button - Only show for active items */}
          {item?.status === 'active' && !timeRemaining?.expired && (
            <View style={styles.bidContainer}>
              <TouchableOpacity
                style={[
                  styles.bidButton, 
                  userIsTopBidder && styles.topBidderButton
                ]}
                onPress={handleBidPress}
              >
                <Ionicons 
                  name={userIsTopBidder ? "checkmark-circle" : "hammer"} 
                  size={20} 
                  color={Colors.WHITE} 
                />
                <Text style={styles.bidButtonText}>
                  {userIsTopBidder ? "You're Top Bidder" : "Place Bid"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bidders Modal */}
      {renderBiddersModal()}

      {/* Bid Modal */}
      {renderBidModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND_WHITE,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    textAlign: 'center',
  },
  headerRight: {
    width: 34,
  },
  scrollContainer: {
    flex: 1,
  },
  imageSliderContainer: {
    height: 300,
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  imageSlide: {
    width: width,
    height: 300,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: Colors.WHITE,
  },
  itemInfoContainer: {
    padding: 20,
  },
  titleSection: {
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleContent: {
    flex: 1,
    marginRight: 10,
  },
  itemTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.TEXT_BLACK,
    marginBottom: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.PRIMARY_GREEN,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.WHITE,
  },
  infoGrid: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  infoCard: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.TEXT_GRAY,
    marginBottom: 5,
    fontWeight: '500',
  },
  startingBidText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.PRIMARY_GREEN,
  },
  topBidText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B6B', // Red color for top bid
  },
  noBidText: {
    color: Colors.TEXT_GRAY, // Gray color when no bids
  },
  conditionText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
  },
  timerCard: {
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    alignItems: 'center',
  },
  timerCardLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginBottom: 15,
  },
  expiredContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  expiredText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6B6B',
    marginLeft: 8,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  timeBlock: {
    alignItems: 'center',
    minWidth: 50,
  },
  timeNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.PRIMARY_GREEN,
  },
  timeLabel: {
    fontSize: 10,
    color: Colors.TEXT_GRAY,
    fontWeight: '500',
    marginTop: 2,
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.TEXT_GRAY,
    marginHorizontal: 10,
  },
  expiryText: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    textAlign: 'center',
  },
  biddersCard: {
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  biddersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  biddersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
  },
  topBidderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBidderAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.PRIMARY_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    overflow: 'hidden',
  },
  topBidderAvatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  topBidderAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.WHITE,
  },
  topBidderDetails: {
    flex: 1,
  },
  topBidderName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
  },
  topBidderLabel: {
    fontSize: 12,
    color: Colors.TEXT_GRAY,
    marginTop: 2,
  },
  topBidderAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.PRIMARY_GREEN,
  },
  noBidsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noBidsText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.TEXT_GRAY,
    marginTop: 10,
  },
  noBidsSubtext: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    marginTop: 5,
  },
  descriptionCard: {
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  descriptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.TEXT_GRAY,
  },
  bidContainer: {
    marginTop: 10,
  },
  bidButton: {
    backgroundColor: Colors.PRIMARY_GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  bidButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.WHITE,
    marginLeft: 8,
  },
  topBidderButton: {
    backgroundColor: '#FF6B6B',
  },
  disabledButton: {
    opacity: 0.6,
  },
  // Bid Modal styles
  bidModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bidModalContent: {
    backgroundColor: Colors.WHITE,
    width: '85%',
    borderRadius: 20,
    maxHeight: '80%',
  },
  bidModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  bidModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
  },
  bidModalCloseButton: {
    padding: 5,
  },
  bidModalBody: {
    padding: 20,
  },
  currentTopBidText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.PRIMARY_GREEN,
    textAlign: 'center',
    marginBottom: 20,
  },
  bidInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginBottom: 10,
  },
  bidInput: {
    borderWidth: 2,
    borderColor: Colors.BACKGROUND_LIGHT_GRAY,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginBottom: 10,
  },
  bidHint: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    textAlign: 'center',
  },
  bidModalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  cancelBidButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.TEXT_GRAY,
    alignItems: 'center',
  },
  cancelBidButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.TEXT_GRAY,
  },
  confirmBidButton: {
    flex: 1,
    backgroundColor: Colors.PRIMARY_GREEN,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmBidButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.WHITE,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND_WHITE,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
  },
  closeButton: {
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: Colors.TEXT_GRAY,
  },
  emptyBidders: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyBiddersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginTop: 15,
  },
  emptyBiddersSubtitle: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    textAlign: 'center',
    marginTop: 8,
  },
  biddersList: {
    flex: 1,
  },
  biddersListContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  bidderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  bidderAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: Colors.PRIMARY_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    overflow: 'hidden',
  },
  bidderAvatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bidderAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.WHITE,
  },
  bidderInfo: {
    flex: 1,
  },
  bidderName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
  },
  bidTime: {
    fontSize: 11,
    color: Colors.TEXT_GRAY,
    marginTop: 2,
  },
  bidAmountContainer: {
    alignItems: 'flex-end',
  },
  bidAmount: {
    fontSize: 16,
    fontWeight: '700',
    // Color will be set dynamically based on bid type
  },
  topBidLabel: {
    fontSize: 10,
    color: '#FF6B6B',
    fontWeight: '600',
    marginTop: 2,
  },
});
