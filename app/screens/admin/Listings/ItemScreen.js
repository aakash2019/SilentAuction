// screens/admin/Listings/ItemScreen.js
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
  ActivityIndicator
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../../constants/Colors';
import { useNavigation, useRoute } from '@react-navigation/native';
import { collection, getDocs, query, orderBy, limit, doc, deleteDoc, setDoc, addDoc, getDoc, increment } from 'firebase/firestore';
import { db } from '../../../firebase';
import NotificationService from '../../../services/NotificationService';

const { width } = Dimensions.get('window');

export default function ItemScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { item: routeItem } = route.params;

  const [item, setItem] = useState(routeItem);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showBiddersModal, setShowBiddersModal] = useState(false);
  const [bidders, setBidders] = useState([]);
  const [isLoadingBidders, setIsLoadingBidders] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMarkSoldModal, setShowMarkSoldModal] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [isMarkingSold, setIsMarkingSold] = useState(false);

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

  // Update timer every second for live countdown
  useEffect(() => {
    const updateTimer = () => {
      setTimeRemaining(calculateTimeRemaining());
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000); // Update every second

    return () => clearInterval(interval);
  }, [item?.expiresAt]);

  // Fetch bidders when component mounts
  useEffect(() => {
    fetchBidders();
  }, [item?.id]);

  // Set the top bidder as selected by default when bidders are loaded
  useEffect(() => {
    if (bidders.length > 0 && !selectedBuyer) {
      setSelectedBuyer(bidders[0]); // Auto-select top bidder
    }
  }, [bidders]);

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleEditPress = () => {
    // Navigate to edit item screen with callback
    navigation.navigate('EditItemScreen', { 
      item,
      onItemUpdated: (updatedItem) => {
        setItem(updatedItem);
      }
    });
  };

  const handleDeletePress = () => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item?.itemName}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    if (!item?.id) {
      Alert.alert('Error', 'Item ID not found.');
      return;
    }

    setIsDeleting(true);

    try {
      // Determine the collection path based on item status
      let collectionPath;
      if (item.status === 'active') {
        collectionPath = 'listings/listings/active';
      } else if (item.status === 'sold') {
        collectionPath = 'listings/listings/sold';
      } else {
        collectionPath = 'listings/listings/expired';
      }

      // Delete the item from Firestore
      const docRef = doc(db, collectionPath, item.id);
      await deleteDoc(docRef);

      // Show success message and navigate back to admin tab navigator
      Alert.alert(
        'Success',
        'Item deleted successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to AdminTabNavigator with Listings tab selected
              navigation.reset({
                index: 0,
                routes: [
                  {
                    name: 'AdminTabNavigator',
                    state: {
                      routes: [
                        { name: 'Dashboard' },
                        { name: 'Listings' },
                        { name: 'Users' },
                        { name: 'Settings' }
                      ],
                      index: 1, // Select Listings tab (index 1)
                    },
                  },
                ],
              });
            }
          }
        ]
      );
    } catch (error) {
      
      let errorMessage = 'Failed to delete item';
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Permission denied: Please check Firestore security rules';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMarkAsSold = () => {
    if (bidders.length === 0) {
      Alert.alert('No Bidders', 'There are no bidders for this item. Cannot mark as sold.');
      return;
    }
    
    setSelectedBuyer(bidders[0]); // Reset to top bidder
    setShowMarkSoldModal(true);
  };

  const confirmMarkAsSold = async () => {
    if (!selectedBuyer) {
      Alert.alert('Error', 'Please select a buyer.');
      return;
    }

    setIsMarkingSold(true);

    try {
      // Create the sold item data
      const soldItemData = {
        ...item,
        status: 'sold',
        buyerId: selectedBuyer.bidderId,
        buyerName: selectedBuyer.fullName || 'Unknown User',
        buyerEmail: selectedBuyer.email || '',
        finalBidAmount: selectedBuyer.bidAmount,
        soldAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 1. Add to sold collection
      const soldDocRef = doc(db, 'listings/listings/sold', item.id);
      await setDoc(soldDocRef, soldItemData);

      // Copy all bidders to the sold item's bidders subcollection
      if (bidders.length > 0) {
        for (const bidder of bidders) {
          const bidderDocRef = doc(db, `listings/listings/sold/${item.id}/bidders`, bidder.id);
          await setDoc(bidderDocRef, bidder);
        }
      }

      // 2. Remove from active collection
      const activeDocRef = doc(db, 'listings/listings/active', item.id);
      await deleteDoc(activeDocRef);

      // 3. Move all bidders from active to past bids in users collection
      for (const bidder of bidders) {
        try {
          const userId = bidder.bidderId;
          
          // Create minimal bid data for user's past bids - only itemId and won status
          const bidData = {
            itemId: item.id,
            won: bidder.bidderId === selectedBuyer.bidderId
          };

          // Add to user's past bids
          const pastBidDocRef = doc(db, `users/${userId}/past`, item.id);
          await setDoc(pastBidDocRef, bidData);

          // Remove from user's active bids
          const activeBidDocRef = doc(db, `users/${userId}/active`, item.id);
          await deleteDoc(activeBidDocRef);

        } catch (userError) {
          // Continue with other users even if one fails
        }
      }

      // 4. Add item to winner's purchased collection
      if (selectedBuyer.bidderId) {
        try {
          const purchaseData = {
            itemId: item.id,
            itemName: item.itemName,
            purchaseAmount: selectedBuyer.bidAmount,
            purchasedAt: new Date().toISOString(),
            itemPhoto: item.photos && item.photos.length > 0 ? item.photos[0] : null,
            category: item.category,
            condition: item.condition
          };

          const purchasedDocRef = doc(db, `users/${selectedBuyer.bidderId}/purchased`, item.id);
          await setDoc(purchasedDocRef, purchaseData);
        } catch (purchaseError) {
          // Don't fail the entire operation for this
        }
      }

      // 5. Create win notification for the selected buyer
      try {
        await NotificationService.createWinNotification(
          selectedBuyer.bidderId,
          item.id,
          item.itemName,
          selectedBuyer.bidAmount
        );
      } catch (notificationError) {
        // Don't fail the entire operation if notification fails
      }

      // Update local item state to reflect the sold status
      setItem(prevItem => ({
        ...prevItem,
        status: 'sold',
        buyerId: selectedBuyer.bidderId,
        buyerName: selectedBuyer.fullName || 'Unknown User',
        buyerEmail: selectedBuyer.email || '',
        finalBidAmount: selectedBuyer.bidAmount,
        soldAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      Alert.alert(
        'Success',
        `Item sold to ${selectedBuyer.fullName || 'Unknown User'} for ${formatCurrency(selectedBuyer.bidAmount)}!`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowMarkSoldModal(false);
              // Navigate back to AdminTabNavigator with Listings tab selected
              navigation.reset({
                index: 0,
                routes: [
                  {
                    name: 'AdminTabNavigator',
                    state: {
                      routes: [
                        { name: 'Dashboard' },
                        { name: 'Listings' },
                        { name: 'Users' },
                        { name: 'Settings' }
                      ],
                      index: 1, // Select Listings tab (index 1)
                    },
                  },
                ],
              });
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to mark item as sold. Please try again.');
    } finally {
      setIsMarkingSold(false);
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

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
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
    const isTopBidder = index === 0; // First item is top bidder (sorted by highest amount)
    
    // Admin sees all real names
    const displayName = bidder.fullName || 'Unknown User';
    
    // Determine bid amount color: Red for top bid, Yellow for others
    const bidAmountColor = isTopBidder ? '#FF6B6B' : '#FFA500';

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
              {displayName.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          )}
        </View>
        <View style={styles.bidderInfo}>
          <Text style={styles.bidderName}>{displayName}</Text>
          <Text style={styles.bidderEmail}>{bidder.email || 'No email'}</Text>
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
              Bidders will appear here when they place bids
            </Text>
          </View>
        ) : (
          <>
            <FlatList
              data={bidders}
              renderItem={({ item, index }) => renderBidderItem({ item, index })}
              keyExtractor={(item) => item.id}
              style={styles.biddersList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.biddersListContent}
            />
            
            {/* Mark as Sold Button in Bidders Modal - Only for active items */}
            {item?.status === 'active' && (
              <View style={styles.modalBottomActions}>
                <TouchableOpacity
                  style={[styles.markSoldFromModalButton, isMarkingSold && styles.disabledButton]}
                  onPress={() => {
                    setShowBiddersModal(false);
                    setTimeout(() => {
                      handleMarkAsSold();
                    }, 300); // Small delay to allow modal to close
                  }}
                  disabled={isMarkingSold}
                >
                  <Ionicons name="checkmark-circle" size={20} color={Colors.WHITE} />
                  <Text style={styles.markSoldFromModalButtonText}>Mark as Sold</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </SafeAreaView>
    </Modal>
  );

  const renderMarkSoldModal = () => (
    <Modal
      visible={showMarkSoldModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowMarkSoldModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Mark as Sold</Text>
          <TouchableOpacity
            onPress={() => setShowMarkSoldModal(false)}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color={Colors.TEXT_BLACK} />
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          <Text style={styles.modalSubtitle}>
            Select the winning bidder for "{item?.itemName}"
          </Text>

          {bidders.length === 0 ? (
            <View style={styles.emptyBidders}>
              <Ionicons name="people-outline" size={64} color={Colors.TEXT_GRAY} />
              <Text style={styles.emptyBiddersTitle}>No Bidders</Text>
              <Text style={styles.emptyBiddersSubtitle}>
                Cannot mark as sold without bidders
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.buyersList} showsVerticalScrollIndicator={false}>
              {bidders.map((bidder, index) => (
                <TouchableOpacity
                  key={bidder.id}
                  style={[
                    styles.buyerItem,
                    selectedBuyer?.id === bidder.id && styles.selectedBuyerItem
                  ]}
                  onPress={() => setSelectedBuyer(bidder)}
                >
                  <View style={styles.buyerInfo}>
                    <View style={styles.buyerAvatar}>
                      {bidder.profileImage ? (
                        <Image 
                          source={{ uri: bidder.profileImage }} 
                          style={styles.buyerAvatarImage}
                        />
                      ) : (
                        <Text style={styles.buyerAvatarText}>
                          {bidder.fullName?.charAt(0)?.toUpperCase() || 'U'}
                        </Text>
                      )}
                    </View>
                    <View style={styles.buyerDetails}>
                      <Text style={styles.buyerName}>
                        {bidder.fullName || 'Unknown User'}
                        {index === 0 && <Text style={styles.topBidderLabel}> (Top Bidder)</Text>}
                      </Text>
                      <Text style={styles.buyerEmail}>{bidder.email || 'No email'}</Text>
                      <Text style={styles.bidTimeText}>
                        Bid placed: {formatDate(bidder.bidAt)}
                      </Text>
                    </View>
                    <View style={styles.bidAmountContainer}>
                      <Text style={styles.bidAmount}>{formatCurrency(bidder.bidAmount)}</Text>
                    </View>
                  </View>
                  {selectedBuyer?.id === bidder.id && (
                    <Ionicons name="checkmark-circle" size={24} color={Colors.PRIMARY_GREEN} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {bidders.length > 0 && (
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelSoldButton}
                onPress={() => setShowMarkSoldModal(false)}
              >
                <Text style={styles.cancelSoldButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmSoldButton, isMarkingSold && styles.disabledButton]}
                onPress={confirmMarkAsSold}
                disabled={isMarkingSold}
              >
                {isMarkingSold ? (
                  <ActivityIndicator size="small" color={Colors.WHITE} />
                ) : (
                  <Text style={styles.confirmSoldButtonText}>Mark as Sold</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );

  const photos = item?.photos && item.photos.length > 0 ? item.photos : [null];
  const topBidder = getTopBidder();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.TEXT_BLACK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Item Details</Text>
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
                      : require('../../../assets/icon.png')
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
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={handleEditPress}
                  disabled={isDeleting}
                >
                  <Ionicons name="pencil" size={20} color={Colors.PRIMARY_GREEN} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.deleteButton, isDeleting && styles.disabledButton]}
                  onPress={handleDeletePress}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size={16} color="#FF6B6B" />
                  ) : (
                    <Ionicons name="trash" size={20} color="#FF6B6B" />
                  )}
                </TouchableOpacity>
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
                {bidders.length > 0 ? formatCurrency(topBidder.bidAmount) : 'No Bid Yet'}
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
                Bidders {bidders.length === 0 ? '(No Bids Yet)' : `(${bidders.length} bid${bidders.length !== 1 ? 's' : ''})`}
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
                      {topBidder.fullName?.charAt(0)?.toUpperCase() || 'U'}
                    </Text>
                  )}
                </View>
                <View style={styles.topBidderDetails}>
                  <Text style={styles.topBidderName}>
                    {topBidder.fullName || 'Unknown User'}
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

          {/* Mark as Sold Button - Only show for active items with bidders */}
          {item?.status === 'active' && bidders.length > 0 && (
            <View style={styles.markSoldContainer}>
              <TouchableOpacity
                style={[styles.markSoldButton, isMarkingSold && styles.disabledButton]}
                onPress={handleMarkAsSold}
                disabled={isMarkingSold}
              >
                {isMarkingSold ? (
                  <ActivityIndicator size="small" color={Colors.WHITE} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.WHITE} />
                    <Text style={styles.markSoldButtonText}>Mark as Sold</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Buyer Information - Show for sold items */}
          {item?.status === 'sold' && (
            <View style={styles.buyerInfoContainer}>
              <View style={styles.buyerInfoCard}>
                <View style={styles.buyerInfoHeader}>
                  <Ionicons name="person-circle" size={24} color={Colors.PRIMARY_GREEN} />
                  <Text style={styles.buyerInfoTitle}>Sold To</Text>
                </View>
                <View style={styles.buyerInfoContent}>
                  <Text style={styles.buyerName}>{item.buyerName || 'Unknown Buyer'}</Text>
                  <Text style={styles.buyerEmail}>{item.buyerEmail || 'No email'}</Text>
                  <Text style={styles.saleAmount}>
                    Final Sale: {formatCurrency(item.finalBidAmount || 0)}
                  </Text>
                  <Text style={styles.saleDate}>
                    Sold on: {formatDate(item.soldAt)}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bidders Modal */}
      {renderBiddersModal()}

      {/* Mark as Sold Modal */}
      {renderMarkSoldModal()}
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
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.WHITE,
    textTransform: 'capitalize',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  // Compact Info Grid
  infoGrid: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 15,
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
    fontWeight: '600',
    color: Colors.TEXT_GRAY,
    marginBottom: 4,
    textTransform: 'uppercase',
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
    textTransform: 'capitalize',
  },
  // Timer Card
  timerCard: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.PRIMARY_GREEN,
  },
  timerCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.TEXT_GRAY,
    textAlign: 'center',
    marginBottom: 15,
    textTransform: 'uppercase',
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
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
    fontWeight: '600',
    color: Colors.TEXT_GRAY,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  timeSeparator: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.PRIMARY_GREEN,
    marginHorizontal: 5,
  },
  expiredContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  expiredText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6B6B',
    marginLeft: 8,
  },
  expiryText: {
    fontSize: 12,
    color: Colors.TEXT_GRAY,
    textAlign: 'center',
  },
  // Bidders Card
  biddersCard: {
    backgroundColor: Colors.BACKGROUND_WHITE,
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: Colors.TEXT_BLACK,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  biddersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: Colors.PRIMARY_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  topBidderAvatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  topBidderAvatarText: {
    fontSize: 16,
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
    marginTop: 4,
  },
  // Description Card
  descriptionCard: {
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.TEXT_GRAY,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  descriptionText: {
    fontSize: 16,
    color: Colors.TEXT_BLACK,
    lineHeight: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND_WHITE,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginTop: 10,
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
    marginTop: 16,
    marginBottom: 8,
  },
  emptyBiddersSubtitle: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    textAlign: 'center',
    lineHeight: 20,
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
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  bidderAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
    marginBottom: 2,
  },
  bidderEmail: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    marginBottom: 2,
  },
  bidTime: {
    fontSize: 12,
    color: Colors.TEXT_GRAY,
  },
  bidAmountContainer: {
    alignItems: 'flex-end',
  },
  bidAmount: {
    fontSize: 18,
    fontWeight: '700',
    // Color will be set dynamically: Red for top bid, Yellow for others
  },
  topBidLabel: {
    fontSize: 10,
    color: '#FF6B6B',
    fontWeight: '600',
    marginTop: 2,
  },
  // Mark as Sold Styles
  markSoldContainer: {
    paddingHorizontal: 0,
    marginTop: 10,
  },
  markSoldButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  markSoldButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.WHITE,
  },
  // Mark as Sold Modal Styles
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    color: Colors.TEXT_GRAY,
    marginBottom: 20,
    textAlign: 'center',
  },
  buyersList: {
    flex: 1,
    marginBottom: 20,
  },
  buyerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    backgroundColor: Colors.BACKGROUND_WHITE,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  selectedBuyerItem: {
    borderColor: Colors.PRIMARY_GREEN,
    backgroundColor: '#F8FFF8',
  },
  buyerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buyerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.PRIMARY_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    overflow: 'hidden',
  },
  buyerAvatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  buyerAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.WHITE,
  },
  buyerDetails: {
    flex: 1,
  },
  buyerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
  },
  topBidderLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.PRIMARY_GREEN,
  },
  buyerEmail: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    marginTop: 2,
  },
  bidTimeText: {
    fontSize: 12,
    color: Colors.TEXT_GRAY,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelSoldButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    alignItems: 'center',
  },
  cancelSoldButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
  },
  confirmSoldButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  confirmSoldButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.WHITE,
  },
  // Buyer Information Styles
  buyerInfoContainer: {
    paddingHorizontal: 0,
    marginTop: 10,
  },
  buyerInfoCard: {
    backgroundColor: '#E8F5E8',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  buyerInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  buyerInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.PRIMARY_GREEN,
    marginLeft: 8,
  },
  buyerInfoContent: {
    paddingLeft: 32,
  },
  buyerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginBottom: 4,
  },
  buyerEmail: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    marginBottom: 8,
  },
  saleAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 4,
  },
  saleDate: {
    fontSize: 12,
    color: Colors.TEXT_GRAY,
  },
  // Modal Bottom Actions
  modalBottomActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  markSoldFromModalButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  markSoldFromModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.WHITE,
  },
});
